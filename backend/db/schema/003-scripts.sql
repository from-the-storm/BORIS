CREATE TABLE scripts (
    name TEXT PRIMARY KEY,
    script_yaml TEXT NOT NULL DEFAULT '---'
);

INSERT INTO scripts (name) SELECT script FROM scenarios;

ALTER TABLE scenarios ADD CONSTRAINT scenario_script_fk FOREIGN KEY (script) REFERENCES scripts (name) ON DELETE RESTRICT;
