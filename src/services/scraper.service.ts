// src/services/scraper.service.ts
import { Browser, chromium, Page } from "playwright";
import { config } from "../config";
import { ExtractionRule, ScrapedData } from "../types";

export const scrapeUrlWithPlaywright = async (
  url: string,
  extractRules?: ExtractionRule[]
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
    await page.waitForTimeout(2000);

    //USE TRAGETE EXTRACTION OF RULES ARE PROVIDED
    const data =
      extractRules && extractRules.length > 0
        ? await extractWithRules(page, extractRules)
        : await extractPageData(page);

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

// NEW: Targeted extraction function
const extractWithRules = async (
  page: Page,
  rules: ExtractionRule[]
): Promise<ScrapedData> => {
  const result: ScrapedData = {};

  for (const rule of rules) {
    try {
      const elementExists = await page.$(rule.selector).then((el) => !!el);

      if (!elementExists) {
        result[rule.name] = rule.multiple ? [] : null;
        continue;
      }

      if (rule.multiple) {
        // Extract ALL matching elements
        result[rule.name] = await page.$$eval(
          rule.selector,
          (elements, currentRule) => {
            return elements
              .map((el) => {
                try {
                  switch (currentRule.type) {
                    case "text":
                      return el.textContent?.trim() || null;
                    case "html":
                      return el.innerHTML.trim();
                    case "attribute":
                      return currentRule.attribute
                        ? el.getAttribute(currentRule.attribute)
                        : null;
                    default:
                      return null;
                  }
                } catch (error) {
                  return null;
                }
              })
              .filter((item) => item !== null); // Filter out null results
          },
          rule
        );
      } else {
        // Extract ONLY THE FIRST matching element
        result[rule.name] = await page
          .$eval(
            rule.selector,
            (el, currentRule) => {
              try {
                switch (currentRule.type) {
                  case "text":
                    return el.textContent?.trim() || null;
                  case "html":
                    return el.innerHTML.trim();
                  case "attribute":
                    return currentRule.attribute
                      ? el.getAttribute(currentRule.attribute)
                      : null;
                  default:
                    return null;
                }
              } catch (error) {
                return null;
              }
            },
            rule
          )
          .catch(() => null); // If selector fails, return null
      }
    } catch (error) {
      console.warn(`Failed to extract with rule ${rule.name}:`, error);
      result[rule.name] = rule.multiple ? [] : null;
    }
  }

  return result;
};

// Fallback function for general scraping (when no rules provided)
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
