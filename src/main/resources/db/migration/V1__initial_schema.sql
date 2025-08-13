-- Create sequences for IDs
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flashcard_set_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE flashcard_seq START WITH 1 INCREMENT BY 1;


-- Users sequence and table
CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE users (
                       id BIGINT PRIMARY KEY DEFAULT nextval('users_seq'),
                       username VARCHAR(50) UNIQUE NOT NULL,
                       email VARCHAR(100) UNIQUE NOT NULL,
                       password VARCHAR(255) NOT NULL
);

-- FlashcardSet sequence and table
CREATE SEQUENCE flashcard_set_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE flashcard_set (
                               id BIGINT PRIMARY KEY DEFAULT nextval('flashcard_set_seq'),
                               title VARCHAR(100) NOT NULL,
                               description TEXT,
                               is_public BOOLEAN DEFAULT FALSE,
                               owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flashcard sequence and table
CREATE SEQUENCE flashcard_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE flashcard (
                           id BIGINT PRIMARY KEY DEFAULT nextval('flashcard_seq'),
                           term TEXT NOT NULL,
                           definition TEXT NOT NULL,
                           set_id BIGINT NOT NULL REFERENCES flashcard_set(id) ON DELETE CASCADE,
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
