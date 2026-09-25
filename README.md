# AI Resume Analyzer

Starter workspace for an AI resume analyzer and tailoring app. The frontend is React + TypeScript + Vite + Tailwind CSS. The backend is Python + FastAPI and is ready for MongoDB configuration.

## Project structure

```text
backend/
  app/main.py       # FastAPI app and health check
  requirements.txt
src/                # React frontend
```

## Run the frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Run the backend

Install Python 3.11+ first, then from the repository root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

The health endpoint is available at `http://localhost:8000/api/health`. Copy `backend/.env.example` to `backend/.env` when you are ready to connect MongoDB. AI analysis features are intentionally not implemented yet.# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
