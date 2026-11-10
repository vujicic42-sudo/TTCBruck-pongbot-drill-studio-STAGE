# Bluetooth Fix v2

## Root cause
The working Nova Drill Control source uses the Bluetooth advertisement service UUID `0xFEFF` in `requestDevice()` (`filters: [{ services: [SERVICE_UUID] }]`, with `SERVICE_UUID = 0xfeff`).

The Drill Studio previously used `acceptAllDevices` and then name-prefix filters. The robot's advertised 16-bit service UUID is distinct from its private 128-bit Nova GATT service, which is requested as an optional service and discovered after connection.

## Change
- Bluetooth chooser now filters by the proven advertised service UUID `0xFEFF`.
- The private Nova GATT service and write/notify characteristic UUIDs are unchanged.
- Authentication, drill packet logic, timer mode and ball-count mode are unchanged.
- Timer and ball counter UI/source files are unchanged.

## Validation
Static source checks only. A physical connection test with a Pongbot Nova S Pro is still required.
