// src/routes/api/jobs.ts
import express from "express";
import prisma from "../../db";
import { createCrawlJob, getCrawlJob } from "../../services/crawlJob.service";
import { CrawlJobCreateInput } from "../../types";

const router = express.Router();

// POST /api/jobs - Create a new crawl job
router.post("/", async (req, res, next) => {
  try {
    const { url, extractRules }: CrawlJobCreateInput = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const job = await createCrawlJob(url, extractRules);

    res.status(202).json({
      id: job.id,
      url: job.url,
      status: job.status,
      createdAt: job.createdAt,
      message: "Crawl job submitted successfully",
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
    console.log("📋 API: GET /api/jobs called");

    const jobs = await prisma.crawlJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to recent 50 jobs
    });

    console.log(`📋 API: Found ${jobs.length} jobs in database`);

    if (jobs.length > 0) {
      console.log(
        `📋 API: Latest job - ID: ${jobs[0].id}, Status: ${jobs[0].status}, URL: ${jobs[0].url}`
      );
    }

    // Return jobs directly as array (frontend expects this format)
    const response = jobs.map((job: any) => ({
      id: job.id,
      url: job.url,
      status: job.status,
      data: job.data,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    }));

    res.json(response);
  } catch (error) {
    console.error("📋 API: Error in GET /api/jobs:", error);
    next(error);
  }
});

// DELETE /api/jobs/:id - Delete a specific job
router.delete("/:id", async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    // Check if job exists
    const existingJob = await prisma.crawlJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Delete the job
    await prisma.crawlJob.delete({
      where: { id: jobId },
    });

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/jobs/bulk - Delete multiple jobs
router.delete("/bulk", async (req, res, next) => {
  try {
    const { jobIds } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res
        .status(400)
        .json({ error: "jobIds array is required and cannot be empty" });
    }

    // Validate all job IDs are integers
    const validJobIds = jobIds.filter((id) => Number.isInteger(id) && id > 0);

    if (validJobIds.length !== jobIds.length) {
      return res
        .status(400)
        .json({ error: "All job IDs must be valid positive integers" });
    }

    // Delete jobs in bulk
    const deleteResult = await prisma.crawlJob.deleteMany({
      where: {
        id: {
          in: validJobIds,
        },
      },
    });

    res.json({
      message: `Successfully deleted ${deleteResult.count} job(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
