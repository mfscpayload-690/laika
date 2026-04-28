# Laika-Music Project – Next Steps Planning

## 📖 Overview
The **Laika-Music** project is an incremental, modular music platform combining a **React Native** mobile frontend with a **FastAPI** backend, backed by **Supabase** for auth & storage.  The current repository contains:
- **Phase 1**: Mobile player scaffold (audio scan, playback, basic UI).
- **Phase 2**: Backend scaffold (FastAPI entrypoint, health check, core config, JWT helper).

The **AI Context Spec** defines a clear roadmap (phases 1‑6) and a set of core features (hybrid playback, unified search, lyrics, matching engine, recommendation engine, caching, etc.).

Below is a **prioritized implementation plan** that builds on the existing scaffolds, adds missing pieces, and keeps the project incremental and test‑driven.

---

## 🚀 Immediate Next Steps (Today‑to‑2 days)
| # | Scope | Tasks | Owner | Desired Outcome |
|---|-------|-------|-------|-----------------|
| 1️⃣ | **Backend – Supabase Auth** | - Create `.env` variables for `SUPABASE_URL` and `SUPABASE_ANON_KEY`.<br>- Implement `auth.py` with Supabase JWT verification (using `python-jose`).<br>- Add FastAPI dependency `get_current_user` that raises `401` if token missing/invalid.<br>- Write unit tests for token validation. | You / Backend | Secure endpoints & user identification ready for later API calls. |
| 2️⃣ | **Backend – Core Models** | - Define SQLAlchemy (or Tortoise‑ORM) models for `User`, `Song`, `PlayHistory`, `Playlist`, `Like`.
- Add Alembic migration script (or Supabase migration) to create tables.
- Export Pydantic schemas for API responses. | Backend | Persistent data layer in place. |
| 3️⃣ | **Backend – Health Enhancements** | - Return JSON `{status: "ok", version: "0.1.0"}` with optional uptime.
- Add simple **/ping** endpoint for CI health checks. | Backend | More robust health monitoring. |
| 4️⃣ | **Mobile – Auth Integration** | - Install `@supabase/supabase-js` in the mobile project.
- Create a `supabaseClient.ts` wrapper.
- Add login screen (OAuth via Google/Apple) using Supabase auth.
- Store JWT in secure storage (`react-native-keychain`). | Mobile | Users can sign‑in and obtain JWT for backend calls. |
| 5️⃣ | **CI / Dev Workflow** | - Add `pre-commit` hooks for linting (`eslint`, `black`).
- Create a top‑level `Makefile` with shortcuts: `make backend`, `make mobile`, `make test`. | DevOps | Consistent developer experience. |

---

## 📦 Short‑Term (Phase 2 – Weeks 1‑3)
1. **API Endpoints**
   - `GET /songs` – list songs (with optional query params for local/online search).
   - `POST /play` – record a play event (user, song, timestamp).
   - `GET /play-history` – fetch recent plays for recommendation engine.
2. **YouTube Resolver Service**
   - Wrapper around `yt‑dlp` that receives a **track title + artist**, returns best audio URL.
   - Cache results in Redis (optional, stubbed with in‑memory dict for now).
3. **Lyrics Integration**
   - Service that calls `lrclib` API and returns LRC or JSON.
   - Store retrieved lyrics in Redis cache.
4. **Testing**
   - Add `pytest` suite covering auth, song endpoints, and resolver logic.
   - CI pipeline (GitHub Actions) that runs tests on each push.
5. **Documentation**
   - Update `README.md` with backend API spec table.
   - Add OpenAPI schema generation (`fastapi.openapi`).

---

## 🧩 Mid‑Term (Phase 3 – Weeks 4‑6)
| Feature | Description | Implementation Notes |
|---------|-------------|----------------------|
| **Matching Engine** | Choose best YouTube audio for a Spotify track using scoring factors (title similarity, artist similarity, duration match, penalty keywords). | Implement `matching.py` using fuzzy string matching (`RapidFuzz`) and duration tolerance. |
| **Unified Search** | Combine local indexed files with Spotify metadata search results. | Add `search.py` that queries local DB + Spotify API, merges with rank weighting. |
| **Recommendation Engine – Phase 1** | Rule‑based recommendations (top artists, genres, listening history). | Simple Python module reading DB aggregates; expose `/recommendations` endpoint. |
| **Caching Layer** | Connect to Upstash Redis (or local Redis) for lyrics, YouTube URLs, recommendation results. | Use `aioredis` with async wrappers. |

---

## 📈 Long‑Term (Phase 4‑6 – Months 2‑4)
- **Phase 4 – Lyrics Sync UI**: Real‑time lyric highlighting in mobile UI using timestamps.
- **Phase 5 – ML Recommendation Engine**: Train LightFM / Implicit models on PlayHistory, embed vectors, expose vector‑based `/recommendations`.
- **Phase 6 – Performance & Scaling**: Add CDN cache for static assets, move backend to Railway production, enable rate‑limiting, add health monitoring dashboards.

---

## 📂 Suggested File Structure Updates
```
laika-music/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ deps.py        # JWT dependency
│  │  │  ├─ routes/
│  │  │  │  ├─ songs.py
│  │  │  │  ├─ auth.py
│  │  │  │  └─ recommendations.py
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  └─ models.py
│  │  ├─ services/
│  │  │  ├─ yt_resolver.py
│  │  │  ├─ lyrics.py
│  │  │  └─ matcher.py
│  │  └─ main.py
├─ mobile/
│  ├─ src/
│  │  ├─ auth/
│  │  │  └─ supabaseClient.ts
│  │  ├─ components/
│  │  │  ├─ Player.tsx
│  │  │  └─ LyricsView.tsx
│  │  └─ screens/
│  │      ├─ LoginScreen.tsx
│  │      └─ HomeScreen.tsx
└─ planning/
   └─ next_steps.md   ← (this file)
```

---

## ✅ Acceptance Checklist
- [ ] Supabase auth middleware functional and covered by tests.
- [ ] Core DB models defined and migrated.
- [ ] Mobile login flow works and stores JWT.
- [ ] `/songs`, `/play`, `/play-history` endpoints return correct JSON.
- [ ] YouTube resolver returns a valid audio URL for a sample track.
- [ ] Basic rule‑based recommendation endpoint returns a list.
- [ ] CI pipeline runs lint + tests on each push.
- [ ] Updated README reflects new API endpoints and run‑instructions.

Feel free to adjust priorities or ask for specific code scaffolds (e.g., `auth.py` skeleton, a sample model, or a mobile login screen). Let me know which piece you’d like to dive into first!
