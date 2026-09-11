-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentInstruction" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JournalFragment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "startPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalFragment_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FragmentCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fragmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "userCorrected" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FragmentCourse_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "JournalFragment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FragmentCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FourFClassification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fragmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "FourFClassification_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "JournalFragment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "fragmentId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "importance" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Insight_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Insight_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "JournalFragment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FutureItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "fragmentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "dueDate" DATETIME,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FutureItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FutureItem_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "JournalFragment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Journal_date_idx" ON "Journal"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FragmentCourse_fragmentId_courseId_key" ON "FragmentCourse"("fragmentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "FourFClassification_fragmentId_type_key" ON "FourFClassification"("fragmentId", "type");
