-- Question sets / parts with instructions for students
CREATE TABLE IF NOT EXISTS exam_sections (
    section_id   SERIAL PRIMARY KEY,
    exam_id      INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL DEFAULT '',
    description  TEXT DEFAULT NULL,
    order_num    INT NOT NULL DEFAULT 0
);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL
  REFERENCES exam_sections (section_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exam_sections_exam ON exam_sections (exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions (section_id);
