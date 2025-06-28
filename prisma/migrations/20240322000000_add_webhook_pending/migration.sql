-- Create WebhookPending table
CREATE TABLE "WebhookPending" (
    "id" SERIAL PRIMARY KEY,
    "type" VARCHAR(50) NOT NULL,
    "invitationId" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP,
    "status" VARCHAR(50) DEFAULT 'pending',
    "error" TEXT
);

-- Add invitationId to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitationId" VARCHAR(255); 