import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import jobRoutes from "./routes/api/jobs";
import path from "path";

const app = express();

//middleware
app.use(helmet()); //security headers
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(morgan("combined")); //HTTP request logging
app.use(express.json({ limit: "10mb" })); //Parse JSON bodies

//Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

//API routes FIRST
app.use("/api/jobs", jobRoutes);

//Serve static files (this will handle / and serve index.html)
app.use(express.static(path.join(__dirname, "../public")));

//404 handler for API routes (using middleware function)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ message: "API route not found" });
  } else {
    next();
  }
});

//Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
);

export default app;
