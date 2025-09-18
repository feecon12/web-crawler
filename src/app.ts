import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
// import { config } from './config';
import jobRoutes from './routes/api/jobs'


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

//API routes will be here later
app.use('/api/jobs', jobRoutes);

//404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
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
