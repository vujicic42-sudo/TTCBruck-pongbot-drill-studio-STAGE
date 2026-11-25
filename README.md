# STAGE v1.22.1 remaining-ball counter patch

This patch changes only the Team session UI and local visual countdown state.

- Ball-count mode shows Remaining balls / Verbleibende Bälle.
- The counter starts only after Send & Start succeeds.
- It follows the drill ball sequence and each ball's BPM as a browser-side estimate.
- Stop freezes the displayed count.
- Switching to Time stops the displayed ball counter.
- For targets not divisible by drill length, the effective complete-cycle total is displayed.
- No changes to novaBluetooth.js, robot packets, D1, cloud profiles, incremental saving, or migrations.
