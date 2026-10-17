-- Initialize database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- Helper function to fetch current workspace ID safely
CREATE OR REPLACE FUNCTION current_app_workspace() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.workspace_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to fetch current user ID safely
CREATE OR REPLACE FUNCTION current_app_user() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function to enforce append-only immutability on audit_events
CREATE OR REPLACE FUNCTION prevent_audit_tampering() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;
