import {
  freezeTour,
  tabAnchor,
  testIdAnchor,
  widgetAnchor,
} from "./tour-types";

/**
 * Course-instructor per-page mini-tours (signed CIs only — same eligibility
 * gate as the dashboard tour). Copy source of truth:
 * docs/guided-tours/steps-pages-ci.md.
 */

// The agreement page has four render branches; only the picker step is
// conditional (multi-franchise CIs) — the rest are centered.
export const CI_AGREEMENT_TOUR = freezeTour({
  key: "ci-agreement",
  version: 1,
  page: "/ci/agreement",
  readyWhen: widgetAnchor("ci-agreement-view"),
  steps: [
    {
      anchor: null,
      title: "Your agreements",
      body: "This page holds one agreement for each franchise you teach at, so everything you've signed is in one place.",
    },
    {
      anchor: testIdAnchor("ci-agreement-picker"),
      title: "Teaching at more than one franchise?",
      body: "Pick the agreement you want from this list — ones waiting for your signature appear first.",
    },
    {
      anchor: null,
      title: "What the statuses mean",
      body: "“Awaiting your signature” needs you to sign; “Awaiting franchisee” means it's with them; “Signed” is complete; “Expired” needs renewal.",
    },
    {
      anchor: null,
      title: "Keep it current",
      body: "If an agreement is awaiting your signature, sign it here to stay active. Press ? anytime to replay this tour.",
    },
  ],
});

export const CI_TRAINING_TOUR = freezeTour({
  key: "ci-training",
  version: 1,
  page: "/ci/training",
  readyWhen: tabAnchor("receivables"),
  tabs: ["receivables", "progress", "upcoming"],
  steps: [
    {
      anchor: null,
      title: "Your training hub",
      body: "Track your fees, level progress, and upcoming sessions — all in one place.",
    },
    {
      anchor: tabAnchor("receivables"),
      tab: "receivables",
      title: "Fees",
      body: "Your training fees unlock one after another. Tap Pay now on the first unsettled one and pay through Razorpay.",
    },
    {
      anchor: widgetAnchor("receivables-summary"),
      tab: "receivables",
      title: "Your progress bar",
      body: "This shows how many fees you've settled out of the total — watch it fill up as you go.",
    },
    {
      anchor: tabAnchor("progress"),
      tab: "progress",
      title: "Level progress",
      body: "The levels you've completed, with your theory and practical marks for each.",
    },
    {
      anchor: tabAnchor("upcoming"),
      tab: "upcoming",
      title: "Upcoming sessions",
      body: "Sessions you're assigned to — or waiting for — are listed here so you never miss one.",
    },
    {
      anchor: null,
      title: "All set",
      body: "Check in after each session to see your marks and settle the next fee. Press ? anytime to replay this tour.",
    },
  ],
});
