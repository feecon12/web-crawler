export type ScrapedData = Record<string, any>;

// Add this enum
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}