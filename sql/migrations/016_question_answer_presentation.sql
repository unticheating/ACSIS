-- Identification: multiple acceptable answers (choices), one presentation answer, optional explanation
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS presentation_answer TEXT DEFAULT NULL;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS answer_explanation TEXT DEFAULT NULL;
