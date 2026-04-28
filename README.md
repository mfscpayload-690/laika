# laika-music

Incremental build for the Laika-Music distributed platform.

## Current Status

Phase 1 local player module is scaffolded in [mobile](mobile):

- TypeScript React Native structure
- Local device audio scan service
- `react-native-track-player` integration
- Play / pause / next controls
- Background playback service registration
- Basic screens: Home, Library, Player

Phase 2 backend foundation is scaffolded in [backend](backend):

- FastAPI app entrypoint
- `GET /health` endpoint
- `core` config and JWT validation helper for Supabase tokens
- Base folder structure for routers/services/models/utils
- Basic health endpoint test

## Mobile Quick Start

```bash
cd mobile
npm install
npm run start
```

In a second terminal:

```bash
cd mobile
npm run android
```

Notes:

- This Phase 1 module is local-only (no backend calls, no streaming).
- On Android, audio permission is requested at scan time.
- File metadata is inferred from filenames for now.

## Backend Quick Start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/health`.

## Run Tests

```bash
cd backend
pytest
```