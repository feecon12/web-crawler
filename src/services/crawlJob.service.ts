import { Prisma } from "@prisma/client";
import { URL } from "url";
import prisma from "../db";
import { CrawlJobData, crawlQueue } from "../queues/crawl.queue";
import { ExtractionRule, JobStatus } from "../types";

export const createCrawlJob = async (
  url: string,
  extractRules?: ExtractionRule[]
): Promise<any> => {
  const domain = new URL(url).hostname;

  const extractRulesValue =
    extractRules && extractRules.length > 0
      ? (extractRules as unknown as Prisma.InputJsonValue)
      : undefined;

  const job = await prisma.crawlJob.create({
    data: {
      url,
      status: JobStatus.PENDING,
      extractRules: extractRulesValue,
    },
  });

  await crawlQueue.add("crawl", {
    jobId: job.id,
    url: url,
    domain: domain,
    extractRules: extractRules || [],
  } as CrawlJobData);

  return job;
};

export const getCrawlJob = async (id: number): Promise<any> => {
  return await prisma.crawlJob.findUnique({
    where: { id },
  });
};

export const updateCrawlJobStatus = async (
  id: number,
  status: JobStatus,
  data?: any,
  error?: string
): Promise<any> => {
  const updateData: any = {
    status,
    ...(data && { data }),
    ...(error && { error }),
  };

  if (status === JobStatus.RUNNING) {
    updateData.startedAt = new Date();
  } else if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
    updateData.finishedAt = new Date();
  }

  return await prisma.crawlJob.update({
    where: { id },
    data: updateData,
  });
};
