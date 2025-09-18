// src/queues/processors/crawl.processor.ts
import { Worker } from "bullmq";
import { Job } from "bullmq";
import redisConnection from "../index";
import { CrawlJobData } from "../crawl.queue";
import { scrapeUrlWithPlaywright } from "../../services/scraper.service";
import { updateCrawlJobStatus } from "../../services/crawlJob.service";
import { JobStatus } from "../../types";

// Create the worker
export const crawlerWorker = new Worker<CrawlJobData>(
  "crawl",
  async (job: Job<CrawlJobData>) => {
    const { jobId, url } = job.data;

    console.log(`🔄 Starting crawl job ${jobId}: ${url}`);

    try {
      // Update status to RUNNING
      await updateCrawlJobStatus(jobId, JobStatus.RUNNING);

      // Execute the crawl
      const scrapedData = await scrapeUrlWithPlaywright(url);

      // Update status to COMPLETED with data
      await updateCrawlJobStatus(jobId, JobStatus.COMPLETED, scrapedData);

      console.log(`✅ Completed crawl job ${jobId}`);
      return scrapedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Update status to FAILED with error
      await updateCrawlJobStatus(
        jobId,
        JobStatus.FAILED,
        undefined,
        errorMessage
      );

      console.error(`❌ Failed crawl job ${jobId}:`, errorMessage);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs per period
      duration: 1000, // Per second (1 second)
    },
  }
);

// Worker event listeners
crawlerWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed successfully`);
});

crawlerWorker.on("failed", (job, error) => {
  console.error(`💥 Job ${job?.id} failed:`, error.message);
});

crawlerWorker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

console.log("✅ Crawler worker started");
