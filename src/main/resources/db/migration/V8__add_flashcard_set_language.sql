ALTER TABLE flashcard_set
    ADD COLUMN language_code VARCHAR(2) NOT NULL DEFAULT 'en';

ALTER TABLE flashcard_set
    ADD CONSTRAINT chk_flashcard_set_language
        CHECK (language_code IN ('en', 'fr'));
