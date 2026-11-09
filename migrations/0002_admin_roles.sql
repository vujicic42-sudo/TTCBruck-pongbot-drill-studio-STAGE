ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'coach';

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_profile_id INTEGER NOT NULL,
    target_profile_id INTEGER,
    action TEXT NOT NULL,
    object_id TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (actor_profile_id) REFERENCES profiles(id),
    FOREIGN KEY (target_profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

UPDATE profiles
SET role = 'admin'
WHERE lower(email) = 'vujic42@gmail.com';
