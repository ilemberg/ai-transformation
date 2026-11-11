# Ticket to Production

An animated walk through an AI-native software delivery line, and the numbers that show whether an AI
transformation is working.

The **Board** is a project-tracker board with one column per station. Press Start and the three tickets take turns, one event every few seconds; whatever changed (the card, its column, the assignee, a test, the newest comment) is highlighted, and with Follow activity on, the issue view follows the ticket that moved. The ten stations:

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

Three sample tickets take different routes: an AI feature (evals and prompt-injection testing), a payments bug that
starts as an alert (fast lane), and a performance problem (the load test is written first).

The **Reports** page is a dashboard that plays a year of a rollout: every speed metric paired with the quality metric that
keeps it honest, the decision rules that fire when one moves the wrong way, and what the models cost.

The **Dashboard** is a stakeholder view: gadgets for token spend, velocity, cycle time, deploys, uptime and error budget, delivery health, AI adoption and decision rules. Gadgets can be added, removed, resized and dragged into a new order; the layout is saved in your browser.

**Everything here is sample data.** Bookwell is a made-up business-travel booking app. No ticket, log line, cost or
metric was measured.

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
