import axios from "axios";
import parse from "robots-parser";
import prisma from "../db";

export interface DomainRule {
  domain: string;
  crawlDelay: number;
  allowed: boolean;
  userAgent: string | null;
}

export const getOrCreateDomainRule = async (
  domain: string
): Promise<DomainRule> => {
  let rule = await prisma.domainRule.findUnique({
    where: { domain },
  });
  if (!rule) {
    rule = await prisma.domainRule.create({
      data: {
        domain,
        crawlDelay: 5000,
        allowed: true,
      },
    });
  }
  return rule;
};

export const checkRobotsTxt = async (
  domain: string,
  userAgent: string = "MyCrawler/1.0"
): Promise<boolean> => {
  try {
    const robotsTxtUrl = `https://${domain}/robots.txt`;
    const response = await axios.get(robotsTxtUrl, {
      timeout: 10000,
    });

    if (response.status === 200) {
      const robots = parse(robotsTxtUrl, response.data);
      // CORRECTED: isAllowed(userAgent, path)
      return robots.isAllowed(userAgent, "/") ?? true;
    }
  } catch (error: any) {
    console.warn(`Could not fetch robots.txt for ${domain}:`, error.message);
  }

  // Default to true if robots.txt can't be fetched or parsed
  return false;
};

export const updateDomainRuleFromRobots = async (
  domain: string
): Promise<void> => {
  const isAllowed = await checkRobotsTxt(domain);

  await prisma.domainRule.upsert({
    where: { domain },
    update: {
      allowed: isAllowed,
    },
    create: {
      domain,
      allowed: isAllowed,
      crawlDelay: 5000,
    },
  });
};
