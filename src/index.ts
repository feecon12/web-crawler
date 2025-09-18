import app from "./app";
import { config } from "./config";
import prisma from "./db";
import { testRedisConnection } from "./queues";
import "./queues/processors/crawl.processor";

const startServer = async () => {
  try {
    //Test database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Test Redis connection
    await testRedisConnection();

    //Start the server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment ${config.nodeEnv}`);
      console.log(`🔗 Health check: http:localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

//Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefull...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Recieved SIGTERM. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
