# TC500A Control

A hobby and learning project: a web app for controlling Honeywell TC500A thermostats over BACnet.

## Working with the user

The user is building this to learn, so the default output is explanation they can act on.

- Write or edit code only when explicitly asked. Otherwise, explain the steps and show snippets for the user to apply.
- Be explicit: say what each command or piece of code does, why it's needed, and which directory to run it from.
- Check every command, code convention, and suggestion against the current official docs for the tech involved (Vite, React, FastAPI, and so on), then link the page you relied on. Say so when you couldn't verify something.
- Test commands in PowerShell, the user's shell, when you can. Docs often assume a POSIX shell: PowerShell strips a bare `--`, so `npm create vite@latest frontend -- --template react-ts` silently scaffolds the wrong template.

## Layout

- `src/tc500a_control/`: backend
  - `app.py`: FastAPI app and routes
  - `schema.py`: API request and response models
  - `settings.py`: configuration loading
  - `thermostat.py`: TC500A access over BACnet
  - `discover.py`: CLI that finds BACnet devices
- `frontend/`: React single-page app
  - `src/api/`: generated `schema.d.ts` and the typed API client
- `docs/`: TC500A BACnet reference material
- `.env`, `thermostats.toml`: local config, git-ignored, created from the `.example` files. They load relative to the working directory, so start the backend from the repo root.

## Tech stack

Versions live in `pyproject.toml` and `frontend/package.json`.

- **Backend:** Python, uv, FastAPI, Pydantic, pydantic-settings, BACpypes3, Ruff
- **Frontend:** Node (managed by fnm), Vite, React, TypeScript, oxlint, openapi-fetch

FastAPI's OpenAPI schema is the contract between the two. When an API route or model changes, regenerate the frontend types by following `frontend/README.md`.
