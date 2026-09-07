CREATE SEQUENCE forvo_pronunciation_cache_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE forvo_pronunciation_cache (
    id BIGINT DEFAULT nextval('forvo_pronunciation_cache_seq') PRIMARY KEY,
    cache_word VARCHAR(100) NOT NULL,
    language VARCHAR(8) NOT NULL,
    accent VARCHAR(16) NOT NULL DEFAULT '',
    audio_url TEXT,
    source VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_forvo_pronunciation_cache_key UNIQUE (cache_word, language, accent)
);

CREATE INDEX idx_forvo_pronunciation_cache_expires_at
    ON forvo_pronunciation_cache(expires_at);
