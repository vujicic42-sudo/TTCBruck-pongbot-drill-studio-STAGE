# Bluetooth Fix v4

- Replaced per-notification promise waiters with the same continuous notification-driven handshake state machine used by the supplied working Nova Drill Control source.
- Kept the exact Nova advertising, GATT service, write and notify UUIDs from the reference app.
- Serialized BLE writes like the reference app.
- Added a 15-second handshake timeout and disconnect/error diagnostics.
- Fixed the outgoing drill payload: the payload bytes are now spread into the packet rather than passed as one nested Uint8Array.
- Preserved RG timer and ball-count options and the rest of the project.
- Static validation only; physical robot testing is still required.
