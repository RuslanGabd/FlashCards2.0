CREATE SEQUENCE flashcard_annotation_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE flashcard_annotation (
    id BIGINT DEFAULT nextval('flashcard_annotation_seq') PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id BIGINT NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
    drawing_data TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_annotation_user_card UNIQUE (user_id, flashcard_id)
);

CREATE INDEX idx_annotation_user ON flashcard_annotation(user_id);
CREATE INDEX idx_annotation_flashcard ON flashcard_annotation(flashcard_id);
