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
    (1, 'Earthquake Preparedness', 'earthquake', 30, 'easy', 'SE False Creek', '(49.273373, -123.102657)', '<p>Conquer your fears of a quaking earth with the EARTHQUAKE PREP scenario.</p><p>This scenario is around 1 km long and starts in front of Science World.</p>'),
    (2, 'Finding Water', 'water', 90, 'hard', 'NW Marine Drive, UBC', '(49.277565, -123.226386)', '<p>When the world ends, what will you do about water? By the end of the FINDING WATER scenario, that question will be sort of answered.</p><p>This scenario is around 4.5 km long, has some fairly steep uphill sections, and starts at UBC off NW Marine Drive.</p>'),
    (3, 'Group Dynamics', 'group', 40, 'med', 'Main Mall, UBC', '(49.264834, -123.252646)', '<p>Overcome petty human squabblings with the GROUP DYNAMICS scenario. After all, your abilility to avoid perishing in the apocalypse will come down to how well you work together.</p><p>This scenario is around 1.5 km long and starts on Main Mall in front of the Koerner Library at UBC.</p>'),
    (4, 'Living Off The Land', 'land', 90, 'med', 'Stanley Park', '(49.297659, -123.131034)', '<p>In the LIVING OFF THE LAND scenario, you are tasked with finding food, shelter, and water for your group of survivors.</p><p>This scenario starts at the Stanley Park bus loop and comes in two flavours: Long (6.5 km, some uphill walking) and Short (2.5 km). Once you start the scenario, you will be able to choose.</p>')
;
