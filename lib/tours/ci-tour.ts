import {
  freezeTour,
  navAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/** Copy source of truth: docs/guided-tours/steps-ci.md */
export const CI_TOUR = freezeTour({
  key: "ci-dashboard",
  version: 1,
  page: "/ci/dashboard",
  readyWhen: testIdAnchor("stat-cell"),
  steps: [
    {
      anchor: null,
      title: "Welcome to your instructor portal",
      body: "A quick tour of where everything lives. Use Next and Back — skip anytime and replay it later from the ? button in the header.",
    },
    {
      anchor: widgetAnchor("dashboard-stats"),
      title: "Your training at a glance",
      body: "Your current trained level, next session, completed levels and training fee status — all live.",
    },
    {
      anchor: widgetAnchor("dashboard-quick-access"),
      title: "Quick access",
      body: "Shortcuts to your agreements, training fees, progress and upcoming sessions.",
    },
    {
      anchor: navAnchor("/ci/agreement"),
      title: "My Agreement",
      body: "Your per-franchise agreements and their signature status.",
    },
    {
      anchor: navAnchor("/ci/training"),
      title: "Training",
      body: "The training hub: pay training fees, track your level progress, and see upcoming sessions — one page, three tabs.",
    },
    {
      anchor: widgetAnchor("header-notifications"),
      title: "Notifications",
      body: "Alerts about sessions, fees and agreements land here.",
    },
    {
      anchor: widgetAnchor("header-profile"),
      title: "Your profile",
      body: "Your account menu — sign out from here.",
    },
    {
      anchor: null,
      title: "You're all set",
      body: "That's the tour. Replay it anytime from the ? button in the header.",
    },
  ],
});
