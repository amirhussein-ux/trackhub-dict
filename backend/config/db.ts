import mongoose from "mongoose";
import { logger } from "../lib/logger";

function isValidMongoHost(host: string): boolean {
  // Allow only MongoDB Atlas domains or localhost
  const allowedPatterns = [
    /^localhost$/,
    /^127\.0\.0\.1$/,
    /^[a-zA-Z0-9-]+\.mongodb\.net$/,
    /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.mongodb\.net$/,
  ];
  
  return allowedPatterns.some(pattern => pattern.test(host));
}

function buildMongoUrlFromParts(): string | null {
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST ?? "cluster0.ukrtrbj.mongodb.net";
  const database = process.env.MONGODB_DATABASE ?? "";
  const appName = process.env.MONGODB_APP_NAME ?? "Cluster0";

  if (!username || !password) {
    return null;
  }

  if (!isValidMongoHost(host)) {
    throw new Error(`Invalid MongoDB host: ${host}. Only MongoDB Atlas domains and localhost are allowed.`);
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const dbPath = database ? `/${encodeURIComponent(database)}` : "/";
  return `mongodb+srv://${encodedUser}:${encodedPassword}@${host}${dbPath}?appName=${encodeURIComponent(appName)}`;
}

// Connect to MongoDB using the connection string from environment variables.
const connectDB = async (): Promise<void> => {
  const mongoUrl = process.env.MONGODB_URL ?? process.env.MONGODB_URI ?? buildMongoUrlFromParts();

  if (!mongoUrl) {
    throw new Error(
      "MongoDB configuration is missing. Set MONGODB_URL/MONGODB_URI or MONGODB_USERNAME + MONGODB_PASSWORD."
    );
  }

  if (mongoUrl.includes("<db_password>") || mongoUrl.includes("replace-with")) {
    throw new Error("MongoDB URL still contains placeholders. Replace placeholder values with real credentials.");
  }

  // Validate MongoDB URL format to prevent SSRF
  if (!mongoUrl.startsWith("mongodb://") && !mongoUrl.startsWith("mongodb+srv://")) {
    throw new Error("Invalid MongoDB URL protocol. Only mongodb:// and mongodb+srv:// are allowed.");
  }

  try {
    await mongoose.connect(mongoUrl);
    logger.info({}, "MongoDB connected successfully");
  } catch (error) {
    logger.error({ err: error }, "MongoDB connection error");
    throw error;
  }
};

export default connectDB;
