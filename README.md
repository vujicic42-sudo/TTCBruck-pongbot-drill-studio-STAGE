# TTCBruck Pongbot Drill Studio STAGE v1.13

Cloud-profile release using Cloudflare Pages Functions, Cloudflare Access identity, and D1. Browser localStorage is not used for drills.

## Required Cloudflare setup
1. Deploy STAGE with Cloudflare Pages, not GitHub Pages. GitHub Pages cannot execute `/functions` or connect to D1.
2. Create D1 database `pongbot-stage-db`.
3. Run `migrations/0001_init.sql` against the database.
4. In Pages > Settings > Bindings add D1 binding `DB` to `pongbot-stage-db`, or replace the ID in `wrangler.jsonc`.
5. Protect STAGE with Cloudflare Access and allow both coach emails individually.
6. Set `ACCESS_DOMAIN` to your `https://TEAM.cloudflareaccess.com` domain and `ACCESS_AUD` to the STAGE Access application AUD.
7. Redeploy after adding bindings and variables.

## Features
- No fixed basics and no 3 basics button.
- Levels BEG, ADV, EXP; ANF/PROF CSV levels map to BEG/EXP on import.
- German full hand names and revised German playstyle names.
- Imported/created/edited drills save explicitly to the authenticated coach's D1 profile.
- Custom filters can be named, saved, and restored per coach.
- CSV remains available for import/export compatibility.
