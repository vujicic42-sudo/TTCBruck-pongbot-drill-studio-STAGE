# TTCBruck Pongbot Drill Studio STAGE v1.18

Users can create up to 50 personal named sections. Sections live in a wide organizer column between the drill library and the main workspace. Drills are dragged from the library into any section as references, not moved or duplicated. Items can be reordered inside a section; sections can be renamed or deleted without deleting drills. All sections and order are saved per coaching profile in D1.

v1.17 save reliability, D1 event logging, CSV backup, Import CSV under Settings, and sequential ball-count packet behavior are retained.

If `migrations/0003_reliability_collections.sql` was already applied for v1.17, no new migration is needed. Otherwise apply 0003 once before deployment.
