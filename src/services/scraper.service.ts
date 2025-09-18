// src/services/scraper.service.ts
import { chromium, Browser, Page } from "playwright";
import { config } from "../config";
import { ScrapedData } from "../types";

export const scrapeUrlWithPlaywright = async (
  url: string
): Promise<ScrapedData> => {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: config.playwright.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page: Page = await browser.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for a brief moment to ensure content is loaded
    await page.waitForTimeout(2000);

    // Extract data from the page
    const data = await extractPageData(page);

    await browser.close();
    return data;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error(`Playwright scraping failed for ${url}:`, error);
    throw error;
  }
};

const extractPageData = async (page: Page): Promise<ScrapedData> => {
  // This is a basic example - you'll want to customize this for your needs
  const data: ScrapedData = {};

  // Extract title
  data.title = await page.title();

  // Extract meta description
  data.description = await page
    .$eval(
      'meta[name="description"]',
      (el) => el.getAttribute("content") || null
    )
    .catch(() => null);

  // Extract all headings
  data.headings = await page
    .$$eval("h1, h2, h3, h4, h5, h6", (elements) =>
      elements.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || "",
      }))
    )
    .catch(() => []);

  // Extract all links
  data.links = await page
    .$$eval(
      "a",
      (elements) =>
        elements
          .map((el) => ({
            text: el.textContent?.trim() || "",
            href: el.href,
          }))
          .filter((link) => link.href) // Filter out empty links
    )
    .catch(() => []);

  // Extract main content text (simplified)
  data.content = await page
    .$eval(
      "body",
      (el) => el.textContent?.trim()?.substring(0, 500) || "" // First 500 chars
    )
    .catch(() => "");

  return data;
};
