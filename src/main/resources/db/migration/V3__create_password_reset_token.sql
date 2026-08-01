-- V3__create_password_reset_token.sql

-- Create sequence for PasswordResetToken IDs
CREATE SEQUENCE prt_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create the password_reset_token table
CREATE TABLE password_reset_token (
                                      id BIGINT DEFAULT nextval('prt_seq') PRIMARY KEY,
                                      token VARCHAR(255) NOT NULL UNIQUE,
                                      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
                                      expiry_date TIMESTAMP NOT NULL
);

-- Add an index on token for faster lookups
CREATE INDEX idx_prt_token ON password_reset_token(token);
