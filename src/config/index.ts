import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  playwright: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
  },
};
