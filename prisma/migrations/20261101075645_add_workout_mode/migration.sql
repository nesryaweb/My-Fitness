-- CreateEnum
CREATE TYPE "WorkoutMode" AS ENUM ('FULL_SET', 'CIRCUIT');

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "mode" "WorkoutMode" NOT NULL DEFAULT 'FULL_SET';
