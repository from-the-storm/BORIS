-- We need UUID functionality from pgcrypto
CREATE EXTENSION pgcrypto;

-- Generic function for preventing updates to any immutable data:
CREATE OR REPLACE FUNCTION fn_prevent_update() RETURNS trigger AS $$
    BEGIN
        RAISE EXCEPTION 'UPDATE is not allowed to that column/table.';
    END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE users (
    id bigserial PRIMARY KEY,
    first_name varchar(150) NOT NULL,
    email varchar(500) NOT NULL CHECK (email LIKE '%@%'),
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0'),
    survey_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- Emails are stored as case-sensititve but must be unique in a case-insensitive constraint
-- and can be efficiently searched using this case-insensitive index:
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
-- Don't ever allow changes to the 'created' column
CREATE TRIGGER trg_prevent_update__users_created BEFORE UPDATE OF created ON users FOR EACH ROW EXECUTE PROCEDURE fn_prevent_update();

CREATE FUNCTION user_by_email(text) RETURNS users AS $$
    SELECT * FROM users WHERE lower(email) = lower($1);
$$ LANGUAGE SQL;

-- User login requests
CREATE TABLE login_requests (
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0')
);

-- User activity log
CREATE TABLE activity (
    id bigserial PRIMARY KEY,
    user_id bigint NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type varchar(500) NOT NULL,
    "timestamp" timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM "timestamp") = '0'),
    details jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- User activity log is immutable
CREATE TRIGGER trg_prevent_update__activity BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE fn_prevent_update();

-- Teams table
CREATE TABLE teams (
    id bigserial PRIMARY KEY,
    name varchar(500) NOT NULL,
    organization varchar(500) NOT NULL,
    code varchar(10) NOT NULL UNIQUE,
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0')
);

CREATE TABLE team_members (
    user_id bigint NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id bigint NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_admin BOOLEAN NOT NULL DEFAULT false
);
