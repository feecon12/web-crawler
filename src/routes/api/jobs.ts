// src/routes/api/jobs.ts
import express from "express";
import { createCrawlJob, getCrawlJob } from "../../services/crawlJob.service";
import prisma from "../../db";

const router = express.Router();

// POST /api/jobs - Create a new crawl job
router.post("/", async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const job = await createCrawlJob(url);

    res.status(202).json({
      message: "Crawl job submitted successfully",
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/:id - Get job status and results
router.get("/:id", async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const job = await getCrawlJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        data: job.data,
        error: job.error,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs - List all jobs (optional)
router.get("/", async (req, res, next) => {
  try {
    const jobs = await prisma.crawlJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to recent 50 jobs
    });

      res.json({
          jobs: jobs.map((job:any) => ({
        id: job.id,
        url: job.url,
        status: job.status,
        createdAt: job.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
