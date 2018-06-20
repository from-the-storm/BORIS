-- Useful initial data for development

INSERT INTO users (first_name, email, survey_data) VALUES 
    (
        'Alice',
        'alice@example.com',
        '{
            "hasConsented": true,
            "workInTech": true,
            "occupation": "Bug Inserter",
            "age": 30,
            "gender": "f"
        }'::jsonb
    ),
    (
        'Bob',
        'bob@example.com',
        '{
            "hasConsented": true,
            "workInTech": true,
            "occupation": "Bug Inserter",
            "age": 30,
            "gender": "m"
        }'::jsonb
    ),
    (
        'Carl',
        'carl@example.com',
        '{
            "hasConsented": true,
            "workInTech": true,
            "occupation": "Bug Inserter",
            "age": 30,
            "gender": "m"
        }'::jsonb
    );

INSERT INTO scenarios (id, name, script, duration_min, difficulty, start_point_name, start_point, description_html) VALUES 
    (1, 'Earthquake Preparedness', 'earthquake', 30, 'easy', 'SE False Creek', '(49.273373, -123.102657)', '<p>This route (approximately 700m) starts in front of Science World and follows the Seawall to the plaza area in front of Craft Beer Market.</p>'),
    (2, 'Water', 'water', 90, 'hard', 'NW Marine Drive, UBC', '(49.277565, -123.226386)', '<p>This is an <strong>HTML</strong> description.</p>'),
    (3, 'Group Dynamics', 'group', 40, 'med', 'Main Mall, UBC', '(49.264834, -123.252646)', '<p>This training module is designed to introduce you to a few potentially useful ways to work together towards a goal. A goal like not perishing in the cataclysm.</p><p>Start on Main Mall, in front of Koerner Library. <a href="#">View on map</a>.</p><p>Terrain is mostly flat, with one section...</p>'),
    (4, 'Living Off The Land', 'land', 70, 'med', 'Stanley Park', '(49.297659, -123.131034)', '<p>This is an <strong>HTML</strong> description.</p>')
;
