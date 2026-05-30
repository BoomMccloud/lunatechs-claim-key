-- Tables for the API key claim site. Namespaced with claim_ to avoid colliding
-- with the existing schema. Safe to run repeatedly.

DROP TABLE IF EXISTS claim_shares CASCADE;
DROP TABLE IF EXISTS claim_keys CASCADE;
DROP TABLE IF EXISTS claim_otps CASCADE;
DROP TABLE IF EXISTS claim_devices CASCADE;

CREATE TABLE claim_keys (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key      TEXT NOT NULL UNIQUE,
  share_count  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Records which key was shared with which email address (one key per email).
CREATE TABLE claim_shares (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  key_id      BIGINT NOT NULL REFERENCES claim_keys(id) ON DELETE CASCADE,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claim_otps (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        TEXT NOT NULL,
  ip           TEXT,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_otps_email_created_idx
  ON claim_otps (email, created_at);

CREATE INDEX IF NOT EXISTS claim_otps_ip_created_idx
  ON claim_otps (ip, created_at);

-- One claim per device. Set via a signed, long-lived cookie so the same browser
-- can't grab multiple keys using different email addresses.
CREATE TABLE claim_devices (
  device_id      TEXT PRIMARY KEY,
  claimed_email  TEXT NOT NULL,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
