ALTER TABLE flashcard
    ADD COLUMN client_id VARCHAR(36);

UPDATE flashcard
SET client_id = substring(md5('flashcard-' || id::text), 1, 8)
    || '-' || substring(md5('flashcard-' || id::text), 9, 4)
    || '-4' || substring(md5('flashcard-' || id::text), 14, 3)
    || '-8' || substring(md5('flashcard-' || id::text), 18, 3)
    || '-' || substring(md5('flashcard-' || id::text), 21, 12);

ALTER TABLE flashcard
    ALTER COLUMN client_id SET NOT NULL;

CREATE UNIQUE INDEX uk_flashcard_set_client_id
    ON flashcard(set_id, client_id);
