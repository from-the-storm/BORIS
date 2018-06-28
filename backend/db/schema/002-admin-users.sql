CREATE TABLE admin_users (
    user_id bigserial PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);
