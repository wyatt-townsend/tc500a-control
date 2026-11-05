# TC500A Control Frontend

A simple React frontend for interacting with the TC500A thermostat FastAPI backend.

## Development

```sh
npm install
npm run dev
```

## Updating the API types

`src/api/schema.d.ts` is generated from the backend's OpenAPI schema. Regenerate it whenever the API changes:

1. Export the schema from the repo root. This doesn't start the server or connect to any thermostats.

   ```sh
   uv run python -c "import json, pathlib; from tc500a_control.app import app; pathlib.Path('frontend/openapi.json').write_text(json.dumps(app.openapi(), indent=2))"
   ```

2. Generate the types from `frontend/`:

   ```sh
   npx openapi-typescript@7.13.0 openapi.json -o src/api/schema.d.ts
   ```

Run the generator with `npx` rather than installing it, because it requires TypeScript 5 and this project uses TypeScript 7.
