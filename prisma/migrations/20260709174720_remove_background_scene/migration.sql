-- AlterEnum
BEGIN;
CREATE TYPE "FolderType_new" AS ENUM ('SOUNDTRACK');
ALTER TABLE "Folder" ALTER COLUMN "type" TYPE "FolderType_new" USING ("type"::text::"FolderType_new");
ALTER TYPE "FolderType" RENAME TO "FolderType_old";
ALTER TYPE "FolderType_new" RENAME TO "FolderType";
DROP TYPE "public"."FolderType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "RoomState" DROP CONSTRAINT "RoomState_backgroundId_fkey";

-- DropForeignKey
ALTER TABLE "_BackgroundFolders" DROP CONSTRAINT "_BackgroundFolders_A_fkey";

-- DropForeignKey
ALTER TABLE "_BackgroundFolders" DROP CONSTRAINT "_BackgroundFolders_B_fkey";

-- AlterTable
ALTER TABLE "RoomState" DROP COLUMN "backgroundId",
ADD COLUMN     "backgroundColor" TEXT NOT NULL DEFAULT '#0c0a09';

-- DropTable
DROP TABLE "Background";

-- DropTable
DROP TABLE "_BackgroundFolders";
