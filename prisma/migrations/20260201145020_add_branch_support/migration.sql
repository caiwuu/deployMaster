-- AlterTable
ALTER TABLE "deployments" ADD COLUMN "branch" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "defaultBranch" TEXT;
