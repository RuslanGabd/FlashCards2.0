ALTER TABLE flashcard ADD COLUMN sort_position INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_flashcard_set_position ON flashcard (set_id, sort_position, id);
