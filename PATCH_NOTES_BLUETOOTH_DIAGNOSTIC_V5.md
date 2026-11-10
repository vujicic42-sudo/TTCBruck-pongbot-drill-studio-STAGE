# Bluetooth diagnostic v5

This diagnostic build is based on Bluetooth Fix v4. It does not intentionally change the Nova protocol, drill packet format, timer, or ball-count controls.

Changes:
- Logs every existing Bluetooth event to the browser Console with timestamp and event type.
- Adds explicit log entries for GATT disconnection, notification payloads, handshake stage transitions, successful writes, failed writes, and authentication errors.
- Includes the last handshake state in connection errors.

After deployment, open Chrome DevTools > Console, clear the console, connect the robot once, and copy all lines beginning with `[Pongbot BLE` (right-click Console > Save as is also acceptable). Do not send passwords or account credentials.

This build has not been tested with a physical Pongbot robot. It is for diagnosis only.
