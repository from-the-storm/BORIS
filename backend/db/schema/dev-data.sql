-- Useful initial data for development

INSERT INTO users (first_name, email, survey_data) VALUES (
    'Bob',
    'bob@example.com',
    '{
        "hasConsented": true,
        "workInTech": true,
        "occupation": "Bug Inserter",
        "age": 30,
        "gender": "m"
    }'::jsonb
);
