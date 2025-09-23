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
      await updateDomainRuleFromRobots(domain);
      const domainRule = await getOrCreateDomainRule(domain);

      if (!domainRule.allowed) {
        console.warn(
          `Crawling diallowed for domain ${domain} by robots.txt. Failing job ${jobId}.`
        );
        //If not allowed, faul the job immediately
        throw new Error(`Crawling diallowed for domain ${domain}`);
      }

      // 3. Execute the crawl with the provided rules
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
  console.error(`💥 Job ${job?.id} failed with error:`, error.message);
});

crawlerWorker.on("error", (error) => {
  console.error("❌ A Worker error occured:", error);
});

console.log("✅ Crawler worker started and listening for jobs.");
