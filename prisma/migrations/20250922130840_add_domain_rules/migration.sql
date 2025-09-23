-- CreateTable
CREATE TABLE "public"."domain_rules" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "crawlDelay" INTEGER NOT NULL DEFAULT 5000,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_rules_domain_key" ON "public"."domain_rules"("domain");
