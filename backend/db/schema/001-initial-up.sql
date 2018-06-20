-- We need UUID functionality from pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    email TEXT NOT NULL CHECK (email LIKE '%@%'),
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0'),
    -- "last active" value used to tell when users are online:
    last_active timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM last_active) = '0'),
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

-- Teams table
CREATE TABLE teams (
    id bigserial PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    code varchar(10) NOT NULL UNIQUE,
    created timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM created) = '0'),
    game_vars jsonb NOT NULL DEFAULT '{}'::jsonb -- team_vars:
);

CREATE TABLE team_members (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id bigint NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    -- A user can be a member of multiple teams but only "active" (online) on one team at any given time:
    is_active BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, team_id)
);

-- A user can be a member of multiple teams but only "active" (online) on one team at any given time:
CREATE UNIQUE INDEX active_team ON team_members (user_id) WHERE is_active = TRUE;

-- Scenarios Table
CREATE TYPE scenario_difficulty AS ENUM ('easy', 'med', 'hard');
CREATE TABLE scenarios (
    id bigserial PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT true,
    name TEXT NOT NULL,
    script TEXT NOT NULL DEFAULT '',
    duration_min integer NOT NULL DEFAULT 30,
    difficulty scenario_difficulty NOT NULL DEFAULT 'med',
    start_point_name TEXT NOT NULL DEFAULT 'Start Point',
    start_point point NOT NULL DEFAULT '(49.297878, -123.088417)',
    description_html text NOT NULL DEFAULT ''
);

-- Games Table
CREATE TABLE games (
    id bigserial PRIMARY KEY,
    team_id bigint NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    scenario_id bigint NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    started timestamp WITH TIME ZONE NOT NULL DEFAULT NOW() CHECK(EXTRACT(TIMEZONE FROM started) = '0'),
    is_active BOOLEAN NOT NULL DEFAULT true, -- Is this team *currently* playing this game? If false and finished is null, they abandoned it.
    finished timestamp WITH TIME ZONE NULL CHECK(EXTRACT(TIMEZONE FROM finished) = '0'),
    CHECK((is_active = TRUE AND finished IS NULL) OR (is_active = FALSE)),
    game_vars jsonb NOT NULL DEFAULT '{}'::jsonb, -- game_vars (and step vars which are game_vars prefixed with a step_id)
    pending_team_vars jsonb NOT NULL DEFAULT '{}'::jsonb -- updates to team vars that will be applied once this game ends
);
-- A team can only play one game at a time
CREATE UNIQUE INDEX active_game ON games (team_id) WHERE is_active = TRUE;
