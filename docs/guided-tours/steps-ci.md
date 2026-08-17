# Tour: `ci-dashboard` (v1)

Runs on `/ci/dashboard` for CIs whose agreement phase is SIGNED (pre-signature CIs
are excluded — their page has no header actions at all). Ready when
`[data-testid="stat-cell"]` exists. 8 steps. Encoded in `lib/tours/ci-tour.ts` —
edit copy here first, then mirror it there.

| # | Anchor | Title | Copy |
|---|---|---|---|
| 1 | _(centered)_ | Welcome to your instructor portal | A quick tour of where everything lives. Use Next and Back — skip anytime and replay it later from the ? button in the header. |
| 2 | `dashboard-stats` | Your training at a glance | Your current trained level, next session, completed levels and training fee status — all live. |
| 3 | `dashboard-quick-access` | Quick access | Shortcuts to your agreements, training fees, progress and upcoming sessions. |
| 4 | `nav:/ci/agreement` | My Agreement | Your per-franchise agreements and their signature status. |
| 5 | `nav:/ci/training` | Training | The training hub: pay training fees, track your level progress, and see upcoming sessions — one page, three tabs. |
| 6 | `header-notifications` | Notifications | Alerts about sessions, fees and agreements land here. |
| 7 | `header-profile` | Your profile | Your account menu — sign out from here. |
| 8 | _(centered)_ | You're all set | That's the tour. Replay it anytime from the ? button in the header. |
