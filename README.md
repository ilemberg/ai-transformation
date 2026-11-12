# adevsworld

Live at [adevsworld.com](https://adevsworld.com).

An animated walk through an AI-native software delivery line, and the numbers that show whether an AI
transformation is working.

The **Delivery board** is a project-tracker board with one column per station, at Bookwell, a business-travel booking company with six product teams. It opens with a 90-second guided tour of the moments that matter, including where the line stops. **Run all tickets** then plays all four tickets, one event every few seconds; whatever changed (the card, its column, the assignee, a test, the newest comment) is highlighted. The ten stations:

| Lane  | Station         | What happens                                                                                  |
| ----- | --------------- | --------------------------------------------------------------------------------------------- |
| Plan  | Intake          | A small model sorts, dedupes and routes the ticket from Jira, GitHub or a monitoring alert    |
| Plan  | Plan            | A large model drafts a spec with acceptance examples; a person argues with it and signs it    |
| Build | Tests first     | Unit, integration, contract, behaviour, end-to-end, browser, accessibility tests, evals and load scripts are written before code, fail, and are locked |
| Build | Build           | A coding agent works in a throwaway cloud sandbox until the locked tests pass                  |
| Build | Review          | A model from a different family reviews, then a security agent, then a person                  |
| Prove | Pipeline gates  | The same checks for every change, whoever wrote it; any red stops the line                     |
| Prove | Load & break-it | Load at twice the peak where it matters, then an agent tries to break it                       |
| Run   | Release         | Feature flag, canary 1% → 100%, live tests in production, automatic rollback                   |
| Run   | Observe         | One request ID through logs, metrics and traces; every model call traced with its cost          |
| Run   | Bug loop        | Every incident becomes a failing test, and the gate that missed it gets stronger               |

Four tickets take different routes:

- **BW-142**, an AI rebooking assistant: evals, prompt-injection testing and a break-it pass.
- **BW-311**, a payments double charge that starts as an alert: fast lane, a reproducing test before any fix.
- **BW-87**, slow hotel search at peak: the load test is written first.
- **BW-158**, a model upgrade: evals stop it at the gates, the coding agent runs out of budget and hands over to a
  person, and the canary rolls it back once before it ships.

**Engineering reports** play a year of the rollout for engineering leads: every speed metric paired with the quality metric that
keeps it honest, the decision rules that fire when one moves the wrong way, and what the models cost.

**Agent runs** show the orchestration behind the board: a full run record with the protected-test rejection and an
approved test amendment, replays of a crashed worker resuming from a checkpoint, a duplicated request being dropped, a
provider timeout falling back, and a cancellation; many runs at once with concurrency limits, isolated workspaces and a
file conflict; and how each team adopted the process.

**Observe** is what an engineer sees in production: a trace explorer that follows one customer request through every
service and model call, a filterable log of model calls with cost, cache and fallback, service health per user journey
with error budget and burn rate, alerts and on-call with an incident timeline, and weekly quality scoring of real AI
answers. Board activity links straight to the matching trace.

**Harness** is everything that steers the agents, versioned and tested: repository instructions, prompts, skills,
tools, policies, eval sets and guardrails with owners and change histories; a nightly harness test against
representative tasks; architecture rules enforced in CI; risk tiers with their size caps and approvals; and the
scheduled cleanup of stale instructions and code, with a quarterly check that engineers can own agent-written code.

The **Executive dashboard** is the stakeholder view, for any month of the rollout: token spend, velocity, cycle time, deploys, uptime and error budget, delivery health, AI adoption and decision rules. Gadgets can be added, removed, resized and dragged into a new order; the layout is saved in your browser.

Model prices are blended per million tokens (most input served from the prompt cache), in line with late-2026 list
prices for small, mid-size and frontier models. The trends follow published findings: the DORA 2024 report estimated
that rising AI adoption came with a 1.5% drop in delivery throughput and a 7.2% drop in stability, which is what the
gates here are built to beat.

## Run it

```bash
pnpm install
pnpm dev
```

`pnpm check` runs lint, types and unit tests.

## Stack

Next.js 16, React 19, Tailwind CSS 4, TypeScript (strict), Vitest. No database and no API keys: the content is typed
data in `src/features/*/`.

## Licence

MIT
