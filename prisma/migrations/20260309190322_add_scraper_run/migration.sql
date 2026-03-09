-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inserted" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,

    CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScraperRun_city_state_ranAt_idx" ON "ScraperRun"("city", "state", "ranAt");
