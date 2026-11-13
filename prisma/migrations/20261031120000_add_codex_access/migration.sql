-- CreateTable
CREATE TABLE "CodexAccess" (
    "userId" TEXT NOT NULL,
    "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodexAccess_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "CodexAccess" ADD CONSTRAINT "CodexAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
