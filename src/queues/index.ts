import { Redis } from "ioredis";
import { config } from "../config";

//create Redis connection
export const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null, //Important for BullMQ
  enableReadyCheck: false,
});

//Handle connection events
redisConnection.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

//Handle connection events
redisConnection.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});

// Test function
export const testRedisConnection = async (): Promise<void> => {
  try {
    await redisConnection.set('test', 'Redis is working!');
    const value = await redisConnection.get('test');
    console.log('🧪 Redis test successful:', value);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  }
};

export default redisConnection;
