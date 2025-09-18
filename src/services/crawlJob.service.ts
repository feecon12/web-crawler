import prisma from "../db";
import { CrawlJobData, crawlQueue } from "../queues/crawl.queue";
import { JobStatus } from "../types";

export const createCrawlJob = async (url: string): Promise<any> => {
  //craete job record in databse
  const job = await prisma.crawlJob.create({
    data: {
      url,
      status: JobStatus.PENDING,
    },
  });

  //add job to BullMQ queue
  await crawlQueue.add("crawl", {
    jobId: job.id,
    url: url,
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
