import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db";
import errorHandler from "./middleware/errorHandler";
import notFound from "./middleware/notFound";
import activityRoutes from "./routes/activityRoutes";
import authRoutes from "./routes/authRoutes";
import documentRoutes from "./routes/documentRoutes";
import itemRoutes from "./routes/itemRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import policyRoutes from "./routes/policyRoutes";
import seedDefaultUsers from "./utils/seedDefaultUsers";

dotenv.config();

const app = express();

// Enable CORS so the React frontend can call this API.
app.use(cors());

// Parse incoming JSON request bodies.
app.use(express.json());

// Basic health route for quick backend checks.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "Backend is running." });
});

// Mount item CRUD routes.
app.use("/api/items", itemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notifications", notificationRoutes);

// Handle unknown routes before centralized error handling.
app.use(notFound);

// Global error handling middleware should be last.
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

// Connect database first, then start server.
connectDB()
  .then(async () => {
    await seedDefaultUsers();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}.`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
