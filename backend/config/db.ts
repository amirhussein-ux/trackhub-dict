import mongoose from "mongoose";

// Connect to MongoDB using the connection string from environment variables.
const connectDB = async (): Promise<void> => {
  const mongoUrl = process.env.MONGODB_URL;

  if (!mongoUrl) {
    throw new Error("MONGODB_URL is not defined in environment variables.");
  }

  try {
    await mongoose.connect(mongoUrl);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
