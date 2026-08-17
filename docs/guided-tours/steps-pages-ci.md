# Page tours: course instructor (2 tours, all v1)

Encoded in `lib/tours/ci-page-tours.ts` — edit copy here first, then mirror it
there. Same anchor syntax as steps-pages-admin.md. Both tours run for SIGNED
CIs only (same eligibility gate as the v1 dashboard tour).

## `ci-agreement` — /ci/agreement — readyWhen `ci-agreement-view`

The page has four render branches; only the picker step is conditional
(multi-franchise CIs), the rest are centered.

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Your agreements | This page holds one agreement for each franchise you teach at, so everything you've signed is in one place. |
| 2 | testid:ci-agreement-picker | | Teaching at more than one franchise? | Pick the agreement you want from this list — ones waiting for your signature appear first. |
| 3 | null | | What the statuses mean | "Awaiting your signature" needs you to sign; "Awaiting franchisee" means it's with them; "Signed" is complete; "Expired" needs renewal. |
| 4 | null | | Keep it current | If an agreement is awaiting your signature, sign it here to stay active. Press ? anytime to replay this tour. |

## `ci-training` — /ci/training — readyWhen `tab:receivables`

| # | Anchor | Tab | Title | Copy |
|---|---|---|---|---|
| 1 | null | | Your training hub | Track your fees, level progress, and upcoming sessions — all in one place. |
| 2 | tab:receivables | receivables | Fees | Your training fees unlock one after another. Tap Pay now on the first unsettled one and pay through Razorpay. |
| 3 | receivables-summary | receivables | Your progress bar | This shows how many fees you've settled out of the total — watch it fill up as you go. |
| 4 | tab:progress | progress | Level progress | The levels you've completed, with your theory and practical marks for each. |
| 5 | tab:upcoming | upcoming | Upcoming sessions | Sessions you're assigned to — or waiting for — are listed here so you never miss one. |
| 6 | null | | All set | Check in after each session to see your marks and settle the next fee. Press ? anytime to replay this tour. |
