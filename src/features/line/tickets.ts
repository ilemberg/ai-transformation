import type { Ticket } from "./types";

/**
 * Three sample tickets for Bookwell, a made-up business-travel booking app.
 * Each one takes a different route through the line, which is the point:
 * the line is the same, the work it does depends on the ticket.
 */
export const TICKETS: Ticket[] = [
  {
    id: "feature",
    key: "BW-142",
    kind: "feature",
    title: "Rebooking assistant: when a hotel cancels, suggest three alternatives within policy",
    source: "Jira, from a customer's travel manager",
    priority: "P2",
    summary:
      "A new AI feature. It gets every station, including evals for the model's suggestions and a break-it pass aimed at prompt injection.",
    tests: {
      unit: { count: 38, unit: "tests", writtenAt: "tests", greenAt: "build" },
      integration: { count: 12, unit: "tests", writtenAt: "tests", greenAt: "build" },
      contract: { count: 4, unit: "tests", writtenAt: "tests", greenAt: "build" },
      behaviour: { count: 9, unit: "scenarios", writtenAt: "tests", greenAt: "build" },
      e2e: { count: 3, unit: "journeys", writtenAt: "tests", greenAt: "gates" },
      browser: { count: 12, unit: "runs", writtenAt: "tests", greenAt: "gates" },
      a11y: { count: 4, unit: "checks", writtenAt: "tests", greenAt: "gates" },
      evals: { count: 120, unit: "cases", writtenAt: "tests", greenAt: "gates" },
      load: { count: 1, unit: "script", writtenAt: "tests", greenAt: "stress" },
      breakit: { count: 3, unit: "new tests", writtenAt: "stress", greenAt: "stress" },
    },
    steps: [
      {
        station: "intake",
        mode: "full",
        log: [
          { who: "triage", text: "Pulled BW-142 from Jira. Area: bookings, suggestions. New AI feature." },
          { who: "triage", text: "Possible duplicate: BW-97 \"auto-rebook on cancel\". Linked; BW-97 is older and smaller in scope." },
          { who: "triage", text: "Risk: medium. Touches booking flow and calls a model with customer data." },
          { who: "triage", text: "Route: all 10 stations. Evals required (AI output). Load test: yes, cancellations spike in storms.", tone: "info" },
        ],
        usage: { ktokens: { small: 18 }, computeMinutes: 1, wallMinutes: 2, humanMinutes: 0 },
      },
      {
        station: "plan",
        mode: "full",
        log: [
          { who: "planner", text: "Read 41 files in bookings/ and policy/. Drafted spec v1 with 6 acceptance examples." },
          { who: "owner", text: "Pushback: suggestions must respect the per-night cap AND the traveller's loyalty programme.", tone: "warn" },
          { who: "owner", text: "Out of scope: auto-booking. A person still confirms." },
          { who: "planner", text: "Spec v2: 9 examples, loyalty rule added, \"no suggestion\" case defined, rollout behind a flag." },
          { who: "owner", text: "Signed spec v2.", tone: "pass" },
        ],
        usage: { ktokens: { large: 220 }, computeMinutes: 6, wallMinutes: 95, humanMinutes: 35 },
      },
      {
        station: "tests",
        mode: "full",
        log: [
          { who: "tester", text: "Wrote 38 unit, 12 integration, 4 contract tests and 9 behaviour scenarios from the 9 examples." },
          { who: "tester", text: "Wrote 3 end-to-end journeys, run on 4 browsers, and 4 accessibility checks." },
          { who: "tester", text: "Built a 120-case eval set: real cancellations, edge cities, 14 prompt-injection attempts." },
          { who: "tester", text: "Load script: 2x storm peak, budget p95 < 900 ms." },
          { who: "ci", text: "All 203 new tests fail, as expected. Mutation check: tests kill 94% of mutants.", tone: "fail" },
          { who: "engineer", text: "Reviewed tests. Added one: suggestion list is empty, not an error, when nothing fits. Locked.", tone: "pass" },
        ],
        usage: { ktokens: { medium: 640 }, computeMinutes: 22, wallMinutes: 70, humanMinutes: 25 },
      },
      {
        station: "build",
        mode: "full",
        log: [
          { who: "builder", text: "Sandbox up: repo, seeded database, model gateway in test mode. No production secrets." },
          { who: "builder", text: "Loop 1: 61 of 63 code tests passing. Failing: loyalty tie-break, currency rounding.", tone: "warn" },
          { who: "builder", text: "Asked to change test BW-142/unit/rounding. Refused: tests are locked. Fixed the code instead.", tone: "warn" },
          { who: "builder", text: "Loop 4: all 63 code tests green. Diff: 412 lines, under the 500 cap.", tone: "pass" },
          { who: "builder", text: "Opened a pull request labelled agent-written. Sandbox torn down after 38 minutes." },
        ],
        usage: { ktokens: { medium: 1450 }, computeMinutes: 38, wallMinutes: 41, humanMinutes: 0 },
      },
      {
        station: "review",
        mode: "full",
        log: [
          { who: "reviewer", text: "Different model family. 2 findings: cache key ignores traveller ID; spec example 7 not covered." },
          { who: "security", text: "Customer's home address sent to the model. Not needed for ranking. Remove it.", tone: "fail" },
          { who: "builder", text: "Fixed all three, added a test for example 7. Re-ran: green.", tone: "pass" },
          { who: "engineer", text: "Read the diff with findings pre-sorted. Approved in 18 minutes.", tone: "pass" },
        ],
        usage: { ktokens: { large: 310, medium: 260 }, computeMinutes: 9, wallMinutes: 75, humanMinutes: 18 },
      },
      {
        station: "gates",
        mode: "full",
        log: [
          { who: "ci", text: "Lint, types, unit, integration, contract: green. Mutation score 91% (gate 85%).", tone: "pass" },
          { who: "ci", text: "Security scan and dependency audit: clean. Page weight +3 KB (budget 20 KB).", tone: "pass" },
          { who: "ci", text: "Preview built. End-to-end on Chrome, Safari, Firefox, phone: green. Accessibility: green.", tone: "pass" },
          { who: "ci", text: "Evals: 112 of 120 (93.3%). Release threshold 92%. Passed.", tone: "pass" },
        ],
        usage: { ktokens: { small: 90, large: 160 }, computeMinutes: 46, wallMinutes: 19, humanMinutes: 0 },
      },
      {
        station: "stress",
        mode: "full",
        log: [
          { who: "loadgen", text: "Storm scenario: 2x peak cancellations for 30 minutes. p95 720 ms, errors 0.02%.", tone: "pass" },
          { who: "breaker", text: "Hotel name containing \"ignore previous instructions\": model held. Logged as eval case." },
          { who: "breaker", text: "Break: two cancels in 200 ms produce duplicate suggestion emails.", tone: "fail" },
          { who: "breaker", text: "Break: suggestions shown in the wrong currency for a Swiss traveller.", tone: "fail" },
          { who: "builder", text: "Both turned into failing tests, then fixed. Third new test for the injection case. All green.", tone: "pass" },
        ],
        usage: { ktokens: { large: 380, medium: 210 }, computeMinutes: 70, wallMinutes: 85, humanMinutes: 10 },
      },
      {
        station: "release",
        mode: "full",
        log: [
          { who: "deployer", text: "Shipped dark behind flag rebooking-assistant. On for internal staff." },
          { who: "deployer", text: "1% of customers. Live journey test every 5 minutes: green. Soak 2 hours.", tone: "pass" },
          { who: "monitor", text: "10% → 50%: error rate flat, suggestion latency p95 640 ms.", tone: "pass" },
          { who: "deployer", text: "100%. Flag kept for a week as a kill switch.", tone: "pass" },
        ],
        usage: { ktokens: { small: 12 }, computeMinutes: 8, wallMinutes: 1440, humanMinutes: 10 },
      },
      {
        station: "observe",
        mode: "full",
        log: [
          { who: "monitor", text: "Dashboard: suggestions shown, accepted (38%), and fallback rate (4%), with a deploy marker." },
          { who: "monitor", text: "Every model call traced: prompt v3, model, 2.1k tokens, $0.004, 1 tool call." },
          { who: "monitor", text: "Weekly drift check: 200 real conversations scored. Pass rate holding at 93%.", tone: "pass" },
        ],
        usage: { ktokens: { small: 40 }, computeMinutes: 4, wallMinutes: 10080, humanMinutes: 15 },
      },
      {
        station: "learn",
        mode: "light",
        reason: "No incident yet. The loop is armed.",
        log: [
          { who: "triage", text: "Watching: any alert or customer report on rebooking opens a ticket with the trace attached." },
          { who: "oncall", text: "The 14 injection attempts and 3 breaks are now permanent eval and test cases.", tone: "info" },
        ],
        usage: { ktokens: {}, computeMinutes: 0, wallMinutes: 0, humanMinutes: 0 },
      },
    ],
  },
  {
    id: "bug",
    key: "BW-311",
    kind: "bug",
    title: "Checkout charges a card twice when 3-D Secure verification times out",
    source: "Monitoring alert, opened automatically",
    priority: "P1",
    pace: 2,
    summary:
      "A payments bug that starts life as an alert. Fast lane: short spec, a reproducing test before anything else, heavy security review, no load test, and a fast canary.",
    tests: {
      unit: { count: 6, unit: "tests", writtenAt: "tests", greenAt: "build" },
      integration: { count: 4, unit: "tests", writtenAt: "plan", greenAt: "build" },
      contract: { count: 2, unit: "tests", writtenAt: "tests", greenAt: "build" },
      behaviour: { count: 2, unit: "scenarios", writtenAt: "tests", greenAt: "build" },
      e2e: { count: 1, unit: "journey", writtenAt: "tests", greenAt: "gates" },
      browser: { count: 4, unit: "runs", writtenAt: "tests", greenAt: "gates" },
      breakit: { count: 2, unit: "new tests", writtenAt: "stress", greenAt: "stress" },
    },
    steps: [
      {
        station: "intake",
        mode: "full",
        log: [
          { who: "monitor", text: "Alert: payment.duplicate_charge > 0 for 10 minutes. 7 customers affected.", tone: "fail" },
          { who: "triage", text: "Opened BW-311 automatically. Attached: trace IDs, deploy 2026.11.09-3, the agent run that wrote it." },
          { who: "triage", text: "Risk: high (money). Route: fast lane. Load test skipped; break-it limited to payments." },
          { who: "oncall", text: "Acknowledged in 3 minutes. Turned off retry-on-timeout flag as a stopgap.", tone: "warn" },
        ],
        usage: { ktokens: { small: 25 }, computeMinutes: 1, wallMinutes: 8, humanMinutes: 6 },
      },
      {
        station: "plan",
        mode: "light",
        reason: "Bugs get a short spec: reproduce, fix, prevent.",
        log: [
          { who: "planner", text: "Read the 7 traces. Cause: retry after a 3-D Secure timeout reuses no idempotency key." },
          { who: "tester", text: "Reproduced it: integration test charges a test card twice. Fails as it should.", tone: "fail" },
          { who: "planner", text: "Spec: every charge carries an idempotency key; a retry with the same key is a no-op." },
          { who: "owner", text: "Signed. Refunds for the 7 customers handled by support today.", tone: "pass" },
        ],
        usage: { ktokens: { large: 140, medium: 60 }, computeMinutes: 8, wallMinutes: 25, humanMinutes: 10 },
      },
      {
        station: "tests",
        mode: "full",
        log: [
          { who: "tester", text: "Added unit and contract tests: same key twice → one charge; new key → new charge." },
          { who: "tester", text: "Behaviour: \"Given a timeout, when the traveller retries, then they are charged once.\"" },
          { who: "ci", text: "14 code tests and the checkout journey red, the reproducer among them. Locked.", tone: "fail" },
        ],
        usage: { ktokens: { medium: 180 }, computeMinutes: 9, wallMinutes: 20, humanMinutes: 8 },
      },
      {
        station: "build",
        mode: "full",
        log: [
          { who: "builder", text: "Sandbox up with the payment provider's test mode." },
          { who: "builder", text: "Added idempotency key at checkout; stored for 24 hours. 46 lines changed." },
          { who: "builder", text: "All 14 code tests green, including the reproducer.", tone: "pass" },
        ],
        usage: { ktokens: { medium: 320 }, computeMinutes: 14, wallMinutes: 16, humanMinutes: 0 },
      },
      {
        station: "review",
        mode: "full",
        log: [
          { who: "reviewer", text: "Key is generated client-side; a reload makes a new one. Move it to the server session.", tone: "fail" },
          { who: "builder", text: "Moved. Added a test for the reload case. Green.", tone: "pass" },
          { who: "security", text: "Key is not guessable and not logged. Payments review: pass.", tone: "pass" },
          { who: "engineer", text: "Two approvals required for payments. Both in.", tone: "pass" },
        ],
        usage: { ktokens: { large: 120, medium: 90 }, computeMinutes: 6, wallMinutes: 35, humanMinutes: 20 },
      },
      {
        station: "gates",
        mode: "full",
        log: [
          { who: "ci", text: "All checks green. Mutation score on checkout/ 96%.", tone: "pass" },
          { who: "ci", text: "Checkout journey on 4 browsers against preview: green.", tone: "pass" },
          { who: "ci", text: "Evals: not applicable, no model involved.", tone: "info" },
        ],
        usage: { ktokens: { small: 30 }, computeMinutes: 31, wallMinutes: 14, humanMinutes: 0 },
      },
      {
        station: "stress",
        mode: "light",
        reason: "Load test skipped: the fix adds one lookup. Break-it aimed at payments only.",
        log: [
          { who: "breaker", text: "50 parallel retries with one key: one charge. Pass.", tone: "pass" },
          { who: "breaker", text: "Break: key expiry at exactly 24 h lets a stale retry through.", tone: "fail" },
          { who: "builder", text: "Expiry check made inclusive. Two new tests. Green.", tone: "pass" },
        ],
        usage: { ktokens: { large: 110 }, computeMinutes: 12, wallMinutes: 22, humanMinutes: 0 },
      },
      {
        station: "release",
        mode: "full",
        log: [
          { who: "deployer", text: "Fast canary for a P1: 5% for 15 minutes, then 100%." },
          { who: "monitor", text: "Live test buys a refundable test booking every 2 minutes: one charge each.", tone: "pass" },
          { who: "deployer", text: "100%. Retry-on-timeout flag back on.", tone: "pass" },
        ],
        usage: { ktokens: { small: 6 }, computeMinutes: 4, wallMinutes: 40, humanMinutes: 5 },
      },
      {
        station: "observe",
        mode: "full",
        log: [
          { who: "monitor", text: "payment.duplicate_charge = 0 for 7 days. Retries succeeding: 98%.", tone: "pass" },
          { who: "monitor", text: "Time to restore: 52 minutes (stopgap). Time to fix in production: 3 h 20 min." },
        ],
        usage: { ktokens: { small: 10 }, computeMinutes: 2, wallMinutes: 10080, humanMinutes: 5 },
      },
      {
        station: "learn",
        mode: "full",
        log: [
          { who: "oncall", text: "Which gate should have caught it? Break-it never covered payment retries.", tone: "warn" },
          { who: "oncall", text: "New rule in gates: any code that calls the payment provider needs an idempotency test." },
          { who: "triage", text: "The original change was agent-written. Spec template now asks \"what happens on retry?\".", tone: "info" },
          { who: "oncall", text: "Blameless review published. Incident closed.", tone: "pass" },
        ],
        usage: { ktokens: { small: 15, large: 40 }, computeMinutes: 1, wallMinutes: 90, humanMinutes: 45 },
      },
    ],
  },
  {
    id: "performance",
    key: "BW-87",
    kind: "performance",
    title: "Hotel search takes 2.4 seconds at the Monday 8 am peak",
    source: "GitHub issue, from customer support",
    priority: "P2",
    summary:
      "A speed problem. The test written first is a load test with a budget. The stress station is the main event, and the fix leaves a permanent speed budget in the pipeline.",
    tests: {
      unit: { count: 14, unit: "tests", writtenAt: "tests", greenAt: "build" },
      integration: { count: 6, unit: "tests", writtenAt: "tests", greenAt: "build" },
      contract: { count: 3, unit: "tests", writtenAt: "tests", greenAt: "build" },
      e2e: { count: 2, unit: "journeys", writtenAt: "tests", greenAt: "gates" },
      browser: { count: 8, unit: "runs", writtenAt: "tests", greenAt: "gates" },
      load: { count: 3, unit: "scenarios", writtenAt: "tests", greenAt: "stress" },
      breakit: { count: 1, unit: "new test", writtenAt: "stress", greenAt: "stress" },
    },
    steps: [
      {
        station: "intake",
        mode: "full",
        log: [
          { who: "triage", text: "Pulled #87 from GitHub. 11 support tickets mention slow search on Monday mornings." },
          { who: "triage", text: "Merged 4 duplicates into BW-87." },
          { who: "triage", text: "Route: performance. Load test mandatory. Evals: none.", tone: "info" },
        ],
        usage: { ktokens: { small: 22 }, computeMinutes: 1, wallMinutes: 3, humanMinutes: 0 },
      },
      {
        station: "plan",
        mode: "full",
        log: [
          { who: "planner", text: "Read last Monday's traces: p95 2.4 s. 61% of it is 40 rate lookups per search, one at a time." },
          { who: "planner", text: "Also: hotel photos fetched before results render." },
          { who: "planner", text: "Spec: batch rate lookups, cache rates for 5 minutes, load photos lazily. Budget: p95 < 800 ms." },
          { who: "owner", text: "Pushback: a 5-minute cache must never show a price the traveller cannot book.", tone: "warn" },
          { who: "planner", text: "Spec v2: price is re-checked at the moment of booking. Signed.", tone: "pass" },
        ],
        usage: { ktokens: { large: 190 }, computeMinutes: 9, wallMinutes: 60, humanMinutes: 20 },
      },
      {
        station: "tests",
        mode: "full",
        log: [
          { who: "tester", text: "Load scenarios: Monday peak, 2x peak, 1-hour soak. Budget p95 < 800 ms." },
          { who: "loadgen", text: "Baseline run against staging: p95 2,410 ms. Budget missed, as expected.", tone: "fail" },
          { who: "tester", text: "Unit and integration tests for batching, cache expiry, and the re-check at booking." },
          { who: "ci", text: "23 code tests and 3 load scenarios red. Locked.", tone: "fail" },
        ],
        usage: { ktokens: { medium: 300 }, computeMinutes: 35, wallMinutes: 45, humanMinutes: 10 },
      },
      {
        station: "build",
        mode: "full",
        log: [
          { who: "builder", text: "Batched rate lookups: 40 calls → 1." },
          { who: "builder", text: "Added a 5-minute rate cache, keyed by hotel, dates and rate plan." },
          { who: "builder", text: "Photos load after results. 23 code tests green.", tone: "pass" },
        ],
        usage: { ktokens: { medium: 720 }, computeMinutes: 25, wallMinutes: 28, humanMinutes: 0 },
      },
      {
        station: "review",
        mode: "full",
        log: [
          { who: "reviewer", text: "Cache key misses the traveller's company. Negotiated rates would leak between customers.", tone: "fail" },
          { who: "builder", text: "Company added to the key. New test proves two companies see their own rates.", tone: "pass" },
          { who: "engineer", text: "Approved.", tone: "pass" },
        ],
        usage: { ktokens: { large: 150, medium: 80 }, computeMinutes: 5, wallMinutes: 40, humanMinutes: 15 },
      },
      {
        station: "gates",
        mode: "full",
        log: [
          { who: "ci", text: "All code checks green.", tone: "pass" },
          { who: "ci", text: "Search journey on 4 browsers: green. Largest paint on results 1.1 s → 0.6 s.", tone: "pass" },
        ],
        usage: { ktokens: { small: 25 }, computeMinutes: 28, wallMinutes: 13, humanMinutes: 0 },
      },
      {
        station: "stress",
        mode: "full",
        log: [
          { who: "loadgen", text: "Monday peak: p95 2,410 → 610 ms. Budget met.", tone: "pass" },
          { who: "loadgen", text: "2x peak: p95 780 ms, database CPU 54%. Budget met.", tone: "pass" },
          { who: "loadgen", text: "1-hour soak: memory flat, cache hit rate 87%.", tone: "pass" },
          { who: "breaker", text: "Break: rate changes upstream while cached; booking shows the old price for a moment.", tone: "fail" },
          { who: "builder", text: "Booking page now shows the re-checked price before payment. Test added. Green.", tone: "pass" },
        ],
        usage: { ktokens: { large: 90, medium: 60 }, computeMinutes: 140, wallMinutes: 110, humanMinutes: 10 },
      },
      {
        station: "release",
        mode: "full",
        log: [
          { who: "deployer", text: "Canary 10% on a Monday morning, on purpose: real peak, small blast radius." },
          { who: "monitor", text: "Canary p95 590 ms vs 2,350 ms on the old version.", tone: "pass" },
          { who: "deployer", text: "100%.", tone: "pass" },
        ],
        usage: { ktokens: { small: 8 }, computeMinutes: 4, wallMinutes: 180, humanMinutes: 5 },
      },
      {
        station: "observe",
        mode: "full",
        log: [
          { who: "monitor", text: "Search latency chart drops at the deploy marker. Support tickets on speed: 11 → 0." },
          { who: "monitor", text: "New alert: rate cache hit rate below 60% for 15 minutes." },
        ],
        usage: { ktokens: { small: 10 }, computeMinutes: 2, wallMinutes: 10080, humanMinutes: 5 },
      },
      {
        station: "learn",
        mode: "full",
        log: [
          { who: "oncall", text: "Why did it get slow unnoticed? There was no speed budget in the pipeline.", tone: "warn" },
          { who: "oncall", text: "Search p95 budget is now a permanent gate, run nightly against staging.", tone: "pass" },
        ],
        usage: { ktokens: { small: 6 }, computeMinutes: 1, wallMinutes: 30, humanMinutes: 15 },
      },
    ],
  },
];
