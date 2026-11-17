PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS user_event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    profile_id INTEGER,
    email TEXT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL DEFAULT '',
    details_json TEXT NOT NULL DEFAULT '{}',
    client_timestamp TEXT,
    server_timestamp TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_user_event_profile ON user_event_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_event_type ON user_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_user_event_time ON user_event_log(server_timestamp);

CREATE TABLE IF NOT EXISTS coach_collections (
    id TEXT PRIMARY KEY,
    profile_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_collections_profile ON coach_collections(profile_id);

CREATE TABLE IF NOT EXISTS coach_collection_items (
    collection_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (collection_id,drill_id),
    FOREIGN KEY (collection_id) REFERENCES coach_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (drill_id) REFERENCES drills(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_collection_items_order ON coach_collection_items(collection_id,sort_order);
