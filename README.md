# TTCBruck Pongbot Drill Studio STAGE v1.16

Role-based administration for cloud coaching profiles.

## Administrator
`vujic42@gmail.com` is bootstrapped as the STAGE admin. The preferred deployment configuration is also to set the server-side Pages environment variable `ADMIN_EMAIL=vujic42@gmail.com`.

## Capabilities
- Coaches continue to see and save only their own D1 profile.
- The admin can load every coaching profile under Settings.
- The admin can open another profile, inspect drills and saved filters, edit the profile library, and explicitly save it.
- A persistent orange ADMIN VIEW banner identifies the selected coach and provides Return to my profile.
- Admin profile views and updates are written to `audit_log`.
- `/api/admin` returns HTTP 403 for normal coaches.

## Required migration
Run `migrations/0002_admin_roles.sql` once in `pongbot-stage-db` before deploying v1.16.

## v1.16.1 Bluetooth discovery fix

The chooser now uses `acceptAllDevices: true` with the Nova service in `optionalServices`. Some Nova S Pro units do not advertise the custom service UUID in their BLE advertising packet, so the former service-only filter could hide a powered-on robot completely. Connection cleanup, notification waiter cleanup, selection diagnostics, and non-Nova-device errors were also improved. No cloud-profile, admin, D1, UI, timer, count, or drill behavior was changed.
