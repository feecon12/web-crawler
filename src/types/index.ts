export type ScrapedData = Record<string, any>;

export enum JobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface ExtractionRule {
  selector: string;
  name: string;
  type: "text" | "html" | "attribute";
  selectorType: "css" | "xpath";
  attribute?: string;
  multiple?: boolean;
}

export type ExtractionRulesJson = ExtractionRule[] | null;

export interface CrawlJobCreateInput {
  url: string;
  extractRules?: ExtractionRule[];
}
