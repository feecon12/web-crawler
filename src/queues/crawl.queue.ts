import { Queue } from "bullmq";
import redisConnection from "./index";
import {ExtractionRule} from '../types'

//define the job data type
export interface CrawlJobData {
  jobId: number;
  url: string;
  domain: string;
  extractRules: ExtractionRule[];
}

//Create the queue
export const crawlQueue = new Queue<CrawlJobData>("crawl", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, //5 seconds, then 10, then 20
    },
    removeOnComplete: true, //Remove job when complete
    removeOnFail: false, //keep failed jobs for analysis
  },
});

console.log("✅ Crawl queue initialized");

export default crawlQueue;
