
INSERT INTO scenarios (id, name, script, duration_min, difficulty, start_point_name, start_point, description_html) VALUES 
    (123, 'Test Scenario', 'dev-script', 30, 'easy', 'SE False Creek', '(49.273373, -123.102657)', '<p>This route (approximately 700m) starts in front of Science World and follows the Seawall to the plaza area in front of Craft Beer Market.</p>')
;

INSERT INTO users (id, first_name, email, survey_data) VALUES
    (234, 'Tester1', 'tester1@example.com', '{}'::jsonb),
    (235, 'Tester2', 'tester2@example.com', '{}'::jsonb),
    (236, 'Tester3', 'tester3@example.com', '{}'::jsonb)
;
INSERT INTO teams (id, name, organization, code) VALUES
    (345, 'Test Team', 'TestOrg', 'T3ST3R')
;

INSERT INTO team_members (id, user_id, team_id, is_admin, is_active) VALUES
    (2340, 234, 345, TRUE, TRUE),
    (2350, 235, 345, FALSE, TRUE),
    (2360, 236, 345, FALSE, TRUE)
;
