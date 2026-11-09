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
