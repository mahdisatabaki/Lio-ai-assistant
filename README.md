# Liara AI Assistant

A Persian, RTL-first AI support assistant for [Liara](https://liara.ir).

One assistant, three behaviors:

- **Troubleshooting** — paste an error, log, or build output and get one concrete next action.
- **Build on Liara + Guided Deployment** — a minimal service plan and a step-by-step Next.js → Liara deployment.
- **General Liara Q&A** — grounded answers with sources.

Answers are grounded in the official Liara documentation.

## Requirements

- Node.js 20 or newer
- npm

## Getting started

```bash
npm install
```

```bash
npm run dev
```

The application runs at `http://localhost:3000`.

## Commands

| Command         | What it does                        |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start the development server        |
| `npm run lint`  | Lint the codebase                   |
| `npm test`      | Run the test suite                  |
| `npm run build` | Create a production build           |
| `npm start`     | Serve the production build          |

## Configuration

Copy `.env.example` to `.env.local` and fill in the values. All variables are
server-only; none are exposed to the browser.

## Health check

`GET /api/health` returns `{"status":"ok"}` when the application process is
serving requests. It calls no AI model and touches no database, so it is free to
poll.

## Deploying to Liara

The application targets Liara PaaS. `liara.json` sets the `next` platform and
`.liaraignore` keeps `node_modules`, build output, and local secrets out of the
upload. Liara installs dependencies and runs `build`, then `start`.

```bash
liara deploy --app=<app-id> --platform=next
```

The full production runbook is BL-080.

## Documentation

| Document                                | Contents                             |
| --------------------------------------- | ------------------------------------ |
| [CLAUDE.md](CLAUDE.md)                   | Permanent engineering rules          |
| [docs/MVP.md](docs/MVP.md)               | Frozen MVP scope and product thesis  |
| [docs/PRD.md](docs/PRD.md)               | Product behavior and requirements    |
| [docs/TECH.md](docs/TECH.md)             | Technical architecture and stack     |
| [docs/BACKLOG.md](docs/BACKLOG.md)       | Implementation order and status      |
| [docs/EVALS.md](docs/EVALS.md)           | Required AI/product quality behavior |

## Status

Under active development. See [docs/BACKLOG.md](docs/BACKLOG.md) for what is
implemented so far.
