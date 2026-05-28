-- Tables for the API key claim site. Namespaced with claim_ to avoid colliding
-- with the existing schema. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS claim_keys (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key           TEXT NOT NULL UNIQUE,
  claimed_by_email  TEXT,
  claimed_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One key per email, even under concurrent claims.
CREATE UNIQUE INDEX IF NOT EXISTS claim_keys_email_uniq
  ON claim_keys (claimed_by_email)
  WHERE claimed_by_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS claim_otps (
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
CREATE TABLE IF NOT EXISTS claim_devices (
  device_id      TEXT PRIMARY KEY,
  claimed_email  TEXT NOT NULL,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
