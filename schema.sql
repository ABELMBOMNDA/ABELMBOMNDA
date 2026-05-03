-- ============================================================
-- NeuralCards – MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS neuralcards
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE neuralcards;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120)        NOT NULL,
  email         VARCHAR(254)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)        NOT NULL,
  -- password reset
  reset_token         VARCHAR(128)  NULL,
  reset_token_expires DATETIME      NULL,
  created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Flashcard Sets
-- ------------------------------------------------------------
CREATE TABLE flashcard_sets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED        NOT NULL,
  title       VARCHAR(200)        NOT NULL,
  description TEXT                NULL,
  ai_generated     TINYINT(1)      NOT NULL DEFAULT 0,
  true_false_mode  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sets_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_sets_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Cards
-- ------------------------------------------------------------
CREATE TABLE cards (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  set_id      INT UNSIGNED        NOT NULL,
  question    TEXT                NOT NULL,
  answer      TEXT                NOT NULL,
  explanation TEXT                NULL,
  position    SMALLINT UNSIGNED   NOT NULL DEFAULT 0,   -- ordering within set
  created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_set FOREIGN KEY (set_id)
    REFERENCES flashcard_sets (id) ON DELETE CASCADE,
  INDEX idx_cards_set (set_id, position)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Quiz Attempts
-- ------------------------------------------------------------
CREATE TABLE quiz_attempts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED    NOT NULL,
  set_id          INT UNSIGNED    NOT NULL,
  score           SMALLINT UNSIGNED NOT NULL,            -- # correct
  total_questions SMALLINT UNSIGNED NOT NULL,
  percent         DECIMAL(5,2)    NOT NULL,              -- 0.00–100.00
  taken_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attempts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_set  FOREIGN KEY (set_id)
    REFERENCES flashcard_sets (id) ON DELETE CASCADE,
  INDEX idx_attempts_user (user_id),
  INDEX idx_attempts_set  (set_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Quiz Attempt Answers  (per-question detail)
-- ------------------------------------------------------------
CREATE TABLE attempt_answers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id      INT UNSIGNED    NOT NULL,
  card_id         INT UNSIGNED    NOT NULL,
  user_answer     TEXT            NOT NULL,
  is_correct      TINYINT(1)      NOT NULL DEFAULT 0,
  CONSTRAINT fk_answers_attempt FOREIGN KEY (attempt_id)
    REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_card    FOREIGN KEY (card_id)
    REFERENCES cards (id) ON DELETE CASCADE,
  INDEX idx_answers_attempt (attempt_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Refresh Tokens  (JWT rotation)
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED        NOT NULL,
  token_hash  VARCHAR(255)        NOT NULL UNIQUE,
  expires_at  DATETIME            NOT NULL,
  revoked     TINYINT(1)          NOT NULL DEFAULT 0,
  created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_rt_user (user_id)
) ENGINE=InnoDB;
