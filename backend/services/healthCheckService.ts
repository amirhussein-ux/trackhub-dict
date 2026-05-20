/**
 * Database health check service
 * Validates MongoDB connectivity and collection health
 */

import mongoose from "mongoose";
import { logger } from "../lib/logger";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  database: {
    connected: boolean;
    responseTime: number;
    collections?: {
      name: string;
      count: number;
    }[];
  };
  application: {
    uptime: number;
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      externalMB: number;
    };
  };
  version: string;
}

/**
 * Perform comprehensive health check
 * @returns Health check result
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();

  const result: HealthCheckResult = {
    status: "healthy",
    timestamp: new Date(),
    database: {
      connected: mongoose.connection.readyState === 1,
      responseTime: 0,
    },
    application: {
      uptime: process.uptime(),
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
    },
    version: process.env.npm_package_version || "unknown",
  };

  try {
    // Check MongoDB connectivity
    if (!result.database.connected) {
      result.status = "unhealthy";
      logger.warn("Database health check: MongoDB not connected");
      return result;
    }

    // Test database responsiveness
    const dbStartTime = Date.now();
    const db = mongoose.connection.getClient();
    if (db) {
      await db.db("admin").command({ ping: 1 });
      result.database.responseTime = Date.now() - dbStartTime;
    }

    // Collect collection statistics
    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      if (collections) {
        result.database.collections = await Promise.all(
          collections
            .filter((c) => !c.name.startsWith("system."))
            .map(async (c) => {
              try {
                const collection = mongoose.connection.collection(c.name);
                const count = await collection.countDocuments();
                return { name: c.name, count };
              } catch {
                return { name: c.name, count: 0 };
              }
            })
        );
      }
    } catch (error) {
      logger.warn({ err: error }, "Failed to collect collection statistics");
    }

    // Determine overall status
    const memPercent = (result.application.memory.heapUsedMB / result.application.memory.heapTotalMB) * 100;
    if (memPercent > 90) {
      result.status = "degraded";
      logger.warn(`Health check: Memory usage high at ${memPercent.toFixed(1)}%`);
    }

    if (result.database.responseTime > 1000) {
      result.status = "degraded";
      logger.warn(`Health check: Database response time slow at ${result.database.responseTime}ms`);
    }

    return result;
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    result.status = "unhealthy";
    return result;
  }
}

/**
 * Simple ping check (faster than full health check)
 * @returns true if service is responding
 */
export async function ping(): Promise<boolean> {
  try {
    const db = mongoose.connection.getClient();
    if (db) {
      await db.db("admin").command({ ping: 1 }).catch(() => false);
      return true;
    }
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

export default {
  performHealthCheck,
  ping,
};
