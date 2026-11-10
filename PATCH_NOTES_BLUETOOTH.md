# Bluetooth chooser update

## What changed

- Replaced `acceptAllDevices: true` with explicit Web Bluetooth filters.
- The chooser now matches device names beginning with `PONGBOT`, `PONG`, `NOVA`, or `ROBBI` (case variants included), or devices advertising the Nova custom service UUID `02f00000-0000-0000-0000-00000000fe00`.
- The existing Nova GATT service and characteristic UUIDs, authentication handshake, drill packet format, and notification handling remain unchanged.
- A device selected by name is still checked by the existing GATT service lookup and authentication handshake before it is treated as connected.

## Timer and ball counter

The existing Team Session controls in `src/App.jsx` were intentionally left unchanged. They already provide a selectable duration (1–10 minutes) and a ball-count target (1–999), and send the selected mode and value to the robot. Both modes remain available.

## Important compatibility note

Web Bluetooth chooser filters match advertising information. If the robot's Bluetooth advertising name has been manually changed to a different prefix and it does not advertise the Nova service UUID, it will not appear in the filtered chooser. Add that exact name prefix to the filter list in `src/novaBluetooth.js` if needed. The browser does not expose a way for a web page to hide arbitrary devices after opening an unfiltered chooser, so filtering must happen in `requestDevice()`.
