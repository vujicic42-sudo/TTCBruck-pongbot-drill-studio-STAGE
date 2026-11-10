# Bluetooth Fix v3

## Confirmed root cause
The Bluetooth characteristic UUIDs in the Drill Studio did not match the working Nova Drill Control source.

Working Nova reference UUIDs:
- Advertising/discovery service: `0xFEFF`
- Private GATT service: `02f00000-0000-0000-0000-00000000fe00`
- Write characteristic: `02f00000-0000-0000-0000-00000000ff01`
- Notify characteristic: `02f00000-0000-0000-0000-00000000ff02`

The Drill Studio previously had incorrect write/notify UUIDs (`02f0ff01...fe00` and `02f0ff02...fe00`). The earlier error text misleadingly described every NotFoundError as a missing service, even if a characteristic lookup had failed.

## Changes
- Corrected write and notify UUIDs to match the working reference app exactly.
- Kept discovery filtered by advertised service `0xFEFF`.
- Added connection-stage log messages for service and characteristic discovery.
- Kept the authentication sequence and drill packet logic unchanged.
- Timer, ball counter, editor and CSV code are unchanged.

## Validation
ZIP integrity and static UUID consistency checks only. A physical connection test is still required.
