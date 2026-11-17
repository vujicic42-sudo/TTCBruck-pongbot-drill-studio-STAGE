# TTCBruck Pongbot Drill Studio STAGE v1.17

Built from the uploaded current v1.16.1 repository files.

## Changes
- 15-second cloud-save timeout, overlapping-save protection, offline detection, unload warning, retry through Save, and explicit success/failure status.
- D1 `user_event_log` for profile load, save, CSV, Bluetooth and robot events; Admin Settings can load the latest 100 events.
- D1-backed `My Recent Exercises` collection. Drag a library drill into the collection to add a reference; reorder collection entries by drag/drop; removing an entry never deletes the drill.
- Ball-count mode repeats the complete flow with `reps=1` per row and cycle count in the Nova packet. Timer protocol is unchanged.
- CSV Import moved to Settings.
- Export all drills to a timestamped robot-compatible CSV is available in Settings and works without cloud save.

## Required migration
Run `migrations/0003_reliability_collections.sql` once against `pongbot-stage-db` before deployment.

No Wrangler file is included. Cloudflare dashboard remains the source for `DB`, `ACCESS_DOMAIN`, `ACCESS_AUD`, and `ADMIN_EMAIL`.
