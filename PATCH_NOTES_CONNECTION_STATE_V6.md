# Bluetooth connection-state fix v6

## Root cause
The NovaBluetooth callback in `src/App.jsx` used the React state variable `bleState` from the initial render as the fallback for every non-connection event. Because the NovaBluetooth instance is created only once, that callback retained the initial value `disconnected`.

Every later `rx`, `tx`, and other diagnostic event therefore called `setBleState('disconnected')`, even while the GATT connection remained active. This matches the supplied log: the robot authenticated and continued answering periodic status requests, while the UI showed Disconnected.

## Fix
Only actual `connected` and `disconnected` events now update the UI connection state. Other Bluetooth events are logged but do not overwrite the connection state.

No changes were made to the Bluetooth protocol, authentication, drill packet format, timer, ball counter, or drill editor.

## Validation
Static source assertion passed. This ZIP has not been physically tested with the robot. Cloudflare Pages should build from source using its configured build command.
