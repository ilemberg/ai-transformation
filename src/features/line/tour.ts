import type { Cursor } from "./logic";

/** One stop of the guided tour: put a ticket at a point on its route and say why it matters. */
export interface TourStop {
  ticketId: string;
  cursor: Cursor;
  title: string;
  body: string;
}

/** About ninety seconds: the moments that show how the line works, including where it stops. */
export const TOUR: TourStop[] = [
  {
    ticketId: "feature",
    cursor: { step: 0, shown: 4 },
    title: "A ticket comes in",
    body: "A small, cheap model triages it and picks its route. This is an AI feature, so the route includes evals and a load test.",
  },
  {
    ticketId: "feature",
    cursor: { step: 1, shown: 5 },
    title: "A person argues with the spec",
    body: "A large model drafts the spec. The product owner pushes back twice before signing. No code is written until a person signs.",
  },
  {
    ticketId: "feature",
    cursor: { step: 2, shown: 6 },
    title: "Tests and evals before code",
    body: "82 tests, 120 eval cases and a load script are written from the spec. All fail, because there is no code yet. A person reviews them, then they are locked. Mutation testing waits until the code passes.",
  },
  {
    ticketId: "feature",
    cursor: { step: 3, shown: 5 },
    title: "The agent cannot quietly weaken a test",
    body: "It tried to edit a locked test to make its failures go away. The locked-tests rule rejected it and the run recorded the attempt. It fixed the real bug in the code.",
  },
  {
    ticketId: "feature",
    cursor: { step: 3, shown: 7 },
    title: "Changing a test takes a person",
    body: "One test really was wrong: it expected cents on yen. The agent filed an amendment with the evidence, an engineer approved it separately, and the change is on record.",
  },
  {
    ticketId: "feature",
    cursor: { step: 4, shown: 2 },
    title: "A different model reviews",
    body: "A reviewer from another model family, then a security agent. It caught a customer's home address being sent to the model.",
  },
  {
    ticketId: "upgrade",
    cursor: { step: 5, shown: 3 },
    title: "The line stops",
    body: "BW-158 swaps the model behind the rebooking assistant. Evals fall to 89.4% against the old model's 93.1%, with loyalty answers 9 points worse. The ticket goes back to Build.",
  },
  {
    ticketId: "upgrade",
    cursor: { step: 6, shown: 4 },
    title: "Out of budget, a person takes over",
    body: "The coding agent stops at loop 8 with 80% of its budget spent and hands over the failing cases. An engineer finds the cause in minutes.",
  },
  {
    ticketId: "upgrade",
    cursor: { step: 9, shown: 4 },
    title: "The canary rolls itself back",
    body: "At 10% of traffic, latency doubles when the provider is busy. The release rolls back in 4 minutes and no customer sees an error.",
  },
  {
    ticketId: "bug",
    cursor: { step: 9, shown: 4 },
    title: "Every bug makes a gate stronger",
    body: "A double charge arrived as an alert, got a failing test before any fix, and left a new rule in the pipeline so that failure is caught if it comes back.",
  },
];

/** Seconds each stop stays on screen when the tour plays by itself. */
export const TOUR_STOP_MS = 10_000;
