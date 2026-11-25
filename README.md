# TTCBruck Pongbot Drill Studio STAGE v1.22 incremental save patch

Upload these files over the matching paths in the current v1.21 repository.

## Behavior
- Existing rows are read and compared server-side.
- Only genuinely inserted, changed, deleted, or reordered drills, filters, sections, and section items are written.
- Saving without changes performs no content write and creates no success log.
- Authentication no longer updates the profile row on every API call.
- Successful incremental saves create one compact server log only when data changed.
- Client routine success/start logs are suppressed; failures/timeouts remain available.
- Admin profile viewing no longer writes an audit row; an admin edit writes one audit row only when data changed.
- UI reports the exact counts returned by the API.

No D1 migration is required. Bluetooth and CSS are included unchanged from the uploaded v1.21 files.
