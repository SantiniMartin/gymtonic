-- Familia de refresh tokens: permite revocar toda la sesión al detectar reutilización.
-- Las filas existentes reciben una familia propia (cada una queda como sesión independiente).
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
