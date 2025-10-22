// src/services/scraper.service.ts
import { Browser, chromium, ElementHandle, Page } from "playwright";
import { config } from "../config";
import { ExtractionRule, ScrapedData } from "../types";

export const scrapeUrlWithPlaywright = async (
  url: string,
  extractRules?: ExtractionRule[]
): Promise<ScrapedData> => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log(`🌐 Launching browser for ${url}`);

    try {
      browser = await chromium.launch({
        headless: config.playwright.headless,
        args: [
          ...config.playwright.args,
          "--disable-dev-shm-usage", // Helps with memory issues
          "--disable-gpu",
          "--no-first-run",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
        ],
        timeout: config.playwright.timeout,
      });
    } catch (launchError: any) {
      console.log(`❌ Browser launch failed: ${launchError.message}`);
      // If browser executable not found, try with system path
      if (launchError.message.includes("Executable doesn't exist")) {
        console.log(`🔄 Retrying with system chromium...`);
        browser = await chromium.launch({
          headless: config.playwright.headless,
          executablePath: "/usr/bin/chromium-browser", // Common Linux path
          args: [
            ...config.playwright.args,
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
          ],
          timeout: config.playwright.timeout,
        });
      } else {
        throw launchError;
      }
    }

    page = await browser.newPage();

    // Set a reasonable timeout
    await page.setDefaultTimeout(30000);

    console.log(`📄 Navigating to ${url}`);
    // Navigate to the URL with proper error handling
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);

    console.log(`🔍 Extracting data from ${url}`);
    //USE TARGETED EXTRACTION IF RULES ARE PROVIDED
    let migratedRules = extractRules;
    if (extractRules && extractRules.length > 0) {
      // Add backward compatibility for rules without selectorType
      migratedRules = extractRules.map((rule) => ({
        ...rule,
        selectorType: rule.selectorType || ("css" as "css" | "xpath"),
      }));
      console.log(
        `🎯 Using ${migratedRules.length} extraction rule(s) with selector types`
      );
    }

    const data =
      migratedRules && migratedRules.length > 0
        ? await extractWithRules(page, migratedRules)
        : await extractPageData(page);

    console.log(`✅ Successfully scraped ${url}, closing browser`);
    return data;
  } catch (error) {
    console.error(`❌ Playwright scraping failed for ${url}:`, error);
    throw error;
  } finally {
    // Always close the browser, even on errors
    try {
      if (page) {
        console.log(`🔒 Closing page for ${url}`);
        await page.close();
      }
      if (browser) {
        console.log(`🔒 Closing browser for ${url}`);
        await browser.close();
      }
    } catch (closeError) {
      console.warn(`⚠️ Error closing browser for ${url}:`, closeError);
    }
  }
};

// Helper function to get elements based on selector type
const getElements = async (
  page: Page,
  rule: ExtractionRule
): Promise<ElementHandle[]> => {
  if (rule.selectorType === "xpath") {
    return await page.locator(`xpath=${rule.selector}`).elementHandles();
  } else {
    return await page.$$(rule.selector);
  }
};

// Helper function to get single element based on selector type
const getElement = async (
  page: Page,
  rule: ExtractionRule
): Promise<ElementHandle | null> => {
  if (rule.selectorType === "xpath") {
    const elements = await page
      .locator(`xpath=${rule.selector}`)
      .elementHandles();
    return elements.length > 0 ? elements[0] : null;
  } else {
    return await page.$(rule.selector);
  }
};

// Helper function to extract value from element
const extractValueFromElement = async (
  element: ElementHandle,
  rule: ExtractionRule
): Promise<string | null> => {
  try {
    switch (rule.type) {
      case "text":
        return await element.evaluate(
          (el: any) => el.textContent?.trim() || null
        );
      case "html":
        return await element.evaluate(
          (el: any) => el.innerHTML?.trim() || null
        );
      case "attribute":
        if (!rule.attribute) return null;
        return await element.evaluate(
          (el: any, attr: string) => el.getAttribute(attr),
          rule.attribute
        );
      default:
        return null;
    }
  } catch (error) {
    return null;
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
      // Check if element exists
      const element = await getElement(page, rule);

      if (!element) {
        result[rule.name] = rule.multiple ? [] : null;
        continue;
      }

      if (rule.multiple) {
        // Extract ALL matching elements
        const elements = await getElements(page, rule);
        const values = [];

        for (const el of elements) {
          const value = await extractValueFromElement(el, rule);
          if (value !== null) {
            values.push(value);
          }
        }

        result[rule.name] = values;
      } else {
        // Extract ONLY THE FIRST matching element
        result[rule.name] = await extractValueFromElement(element, rule);
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
