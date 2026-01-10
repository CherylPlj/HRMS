-- CreateIndex
CREATE INDEX IF NOT EXISTS "Leave_Status_idx" ON "Leave"("Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Leave_CreatedAt_idx" ON "Leave"("CreatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Leave_FacultyID_idx" ON "Leave"("FacultyID");

-- CreateIndex (composite for common queries filtering by status and ordering by date)
CREATE INDEX IF NOT EXISTS "Leave_Status_CreatedAt_idx" ON "Leave"("Status", "CreatedAt");
