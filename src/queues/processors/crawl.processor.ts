// src/queues/processors/crawl.processor.ts
import { Job, Worker } from "bullmq";
import { updateCrawlJobStatus } from "../../services/crawlJob.service";
import {
  getOrCreateDomainRule,
  updateDomainRuleFromRobots,
} from "../../services/domain.service";
import { scrapeUrlWithPlaywright } from "../../services/scraper.service";
import { JobStatus } from "../../types";
import { CrawlJobData } from "../crawl.queue";
import redisConnection from "../index";

// Create the worker
export const crawlerWorker = new Worker<CrawlJobData>(
  "crawl",
  async (job: Job<CrawlJobData>) => {
    const { jobId, url, domain, extractRules } = job.data;

    console.log(`🔄 Starting crawl job ${jobId} for URL: ${url}`);

    try {
      /// 1. Update status to RUNNING
      await updateCrawlJobStatus(jobId, JobStatus.RUNNING);

      // 2. Politeness Check: Check and update robots.txt rules for the domain
      try {
        await updateDomainRuleFromRobots(domain);
        const domainRule = await getOrCreateDomainRule(domain);

        if (!domainRule.allowed) {
          console.warn(
            `Crawling disallowed for domain ${domain} by robots.txt. Failing job ${jobId}.`
          );
          throw new Error(
            `Crawling disallowed by robots.txt for domain: ${domain}`
          );
        }
        console.log(`✅ Politeness check passed for domain: ${domain}`);
      } catch (error: any) {
        // If it's already a "disallowed" error, re-throw it
        if (error.message.includes("disallowed")) {
          throw error;
        }
        // For other errors (network, etc.), log but allow crawling
        console.warn(
          `⚠️ Robots.txt check failed for ${domain}, proceeding anyway:`,
          error.message
        );
      } // 3. Execute the crawl with the provided rules
      console.log(`Starting Playwright scrape for job ${jobId}`);
      const scrapedData = await scrapeUrlWithPlaywright(
        url,
        extractRules || []
      );

      // 4. Update status to COMPLETED with data
      await updateCrawlJobStatus(jobId, JobStatus.COMPLETED, scrapedData);

      console.log(`✅ Completed crawl job ${jobId}`);
      return scrapedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // 5. Update status to FAILED with error
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
    concurrency: 1, // Process only 1 job at a time to avoid multiple browsers
    limiter: {
      max: 1, // Max 1 job per 3 seconds (slower rate)
      duration: 3000, // Per 3 seconds
    },
  }
);

// Worker event listeners
crawlerWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed successfully`);
});

crawlerWorker.on("failed", (job, error) => {
  console.error(`💥 Job ${job?.id} failed with error:`, error.message);
});

crawlerWorker.on("error", (error) => {
  console.error("❌ A Worker error occured:", error);
});

console.log("✅ Crawler worker started and listening for jobs.");
