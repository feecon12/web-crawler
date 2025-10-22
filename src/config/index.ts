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
    timeout: 30000,
    args:
      process.env.NODE_ENV === "production"
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--single-process",
            "--disable-background-timer-throttling",
          ]
        : [],
  },
};
