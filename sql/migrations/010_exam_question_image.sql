-- Migration 010: Add image_url to exam questions
-- This supports the new image attachment feature for questions.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
