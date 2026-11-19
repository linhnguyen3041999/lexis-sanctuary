CREATE TABLE auth_rate_limits (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL CHECK (count >= 0),
  last_request INTEGER NOT NULL
);

CREATE INDEX idx_auth_rate_limits_last_request ON auth_rate_limits(last_request);
