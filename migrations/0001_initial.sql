PRAGMA foreign_keys = ON;

-- Better Auth 1.7.25 core schema, generated/reviewed from better-auth/db
-- with the custom model and field names configured in worker/auth.ts.
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  image_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider_id, provider_account_id)
);

CREATE TABLE verifications (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (id, user_id),
  UNIQUE (user_id, name_key)
);

CREATE TABLE vocabulary (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  word TEXT NOT NULL,
  word_key TEXT NOT NULL CHECK (length(word_key) > 0),
  word_type TEXT NOT NULL CHECK (word_type IN ('noun', 'verb', 'adjective', 'adverb', 'idiom', 'collocation')),
  cefr_level TEXT CHECK (cefr_level IS NULL OR cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ipa TEXT NOT NULL DEFAULT '',
  synonyms_text TEXT,
  verb_pattern TEXT,
  collocations_markdown TEXT,
  related_forms_markdown TEXT,
  meaning TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, user_id) REFERENCES topics(id, user_id),
  UNIQUE (user_id, word_key)
);

CREATE TABLE vocabulary_skill_tags (
  vocabulary_id TEXT NOT NULL,
  tag TEXT NOT NULL CHECK (tag IN ('speaking', 'writing')),
  PRIMARY KEY (vocabulary_id, tag),
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE
);

CREATE TABLE learning_progress (
  vocabulary_id TEXT PRIMARY KEY NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  repetition INTEGER NOT NULL DEFAULT 0 CHECK (repetition >= 0),
  ease_factor REAL NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  next_review_at INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'good', 'mastered')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_verifications_identifier ON verifications(identifier);
CREATE INDEX idx_verifications_expires_at ON verifications(expires_at);

CREATE INDEX idx_topics_user_name ON topics(user_id, name_key);
CREATE UNIQUE INDEX idx_topics_one_default_per_user ON topics(user_id) WHERE is_default = 1;
CREATE INDEX idx_vocabulary_user_created ON vocabulary(user_id, created_at DESC, id DESC);
CREATE INDEX idx_vocabulary_user_topic_created ON vocabulary(user_id, topic_id, created_at DESC);
CREATE INDEX idx_vocabulary_user_type_cefr ON vocabulary(user_id, word_type, cefr_level);
CREATE INDEX idx_vocabulary_skill_tags_tag ON vocabulary_skill_tags(tag, vocabulary_id);
CREATE INDEX idx_learning_progress_due ON learning_progress(next_review_at, status, vocabulary_id);
