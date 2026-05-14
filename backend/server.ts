import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import connectDB from "./config/db";
import { logger } from "./lib/logger";
import errorHandler from "./middleware/errorHandler";
import notFound from "./middleware/notFound";
import { attachRequestContext } from "./middleware/requestContext";
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

const app = express();

const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:8080";

// Enable CORS so the React frontend can call this API.
app.use(cors({ origin: frontendOrigin, credentials: true }));

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(attachRequestContext);

// Baseline abuse protection for all API traffic.
app.use("/api", apiLimiter);

// Basic health route for quick backend checks.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "Backend is running." });
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
