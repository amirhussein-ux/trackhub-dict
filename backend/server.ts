import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import path from "path";
import connectDB from "./config/db";
import { logger } from "./lib/logger";
import errorHandler from "./middleware/errorHandler";
import notFound from "./middleware/notFound";
import { attachRequestContext } from "./middleware/requestContext";
import requestTimingMiddleware from "./middleware/requestTiming";
import {
  aiGenerationLimiter,
  apiLimiter,
  apiReadLimiter,
  authLimiter,
  createLimiter,
  supportLimiter,
} from "./middleware/rateLimit";
import activityRoutes from "./routes/activityRoutes";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import itemRoutes from "./routes/itemRoutes";
import { requireAuth } from "./middleware/authenticate";
import notificationRoutes from "./routes/notificationRoutes";
import policyRoutes from "./routes/policyRoutes";
import supportRoutes from "./routes/supportRoutes";
import userRoutes from "./routes/userRoutes";
import seedDefaultUsers from "./utils/seedDefaultUsers";
import { startStalePolicyJob } from "./jobs/stalePolicyJob";
import { startEscalationJob } from "./jobs/escalationJob";
import { startArchiveJob } from "./jobs/archiveJob";

const envCandidates = [
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));

dotenv.config(envPath ? { path: envPath } : undefined);

// Strict environment validation - fail fast on startup
const validateEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV;
  const validEnvs = ["development", "production", "test"];

  if (!nodeEnv || !validEnvs.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: "${nodeEnv}". Must be one of: ${validEnvs.join(", ")}`
    );
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error("FRONTEND_URL environment variable is required");
  }

  const authSessionSecret = process.env.AUTH_SESSION_SECRET;
  if (!authSessionSecret || authSessionSecret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET environment variable is required and must be at least 32 characters"
    );
  }

  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error(
      `Invalid PORT: "${port}". Must be a number between 1 and 65535`
    );
  }

  logger.info(
    { nodeEnv, frontendUrl },
    "Environment validation passed"
  );
};

validateEnvironment();

const app = express();

const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:8080";

// Security headers - apply before CORS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", frontendOrigin],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Enable CORS so the React frontend can call this API.
// Important: credentials: true allows cookies to be sent/received
app.use(cors({ 
  origin: frontendOrigin, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(attachRequestContext);
app.use(requestTimingMiddleware);

// Baseline abuse protection for all API traffic.
app.use("/api", apiLimiter);

// Basic health route for quick backend checks.
app.get("/api/health", async (_req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    res.status(503).json({
      status: "unhealthy",
      message: "Backend health check failed",
    });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/policies", requireAuth, apiReadLimiter, createLimiter, policyRoutes);
app.use("/api/documents", requireAuth, apiReadLimiter, createLimiter, documentRoutes);
app.use("/api/activities", requireAuth, apiReadLimiter, createLimiter, activityRoutes);
app.use("/api/notifications", requireAuth, apiReadLimiter, createLimiter, notificationRoutes);
app.use("/api/items", requireAuth, apiReadLimiter, createLimiter, itemRoutes);
app.use("/api/support/contact", requireAuth, supportLimiter, supportRoutes);

// Users management (admin-only).
app.use("/api/users", requireAuth, apiReadLimiter, createLimiter, userRoutes);

// Reserve strict limits for AI endpoints to prevent expensive automated abuse.
app.use("/api/ai", aiGenerationLimiter);
app.use("/api/generate", aiGenerationLimiter);

// Handle unknown routes before centralized error handling.
app.use(notFound);

// Global error handling middleware should be last.
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

// Connect database first, then start server.
connectDB()
  .then(async () => {
    await seedDefaultUsers();
    
    // Start automated workflow jobs
    startStalePolicyJob();
    startEscalationJob();
    startArchiveJob();
    
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Server running");
    });
  })
  .catch((error) => {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  });
