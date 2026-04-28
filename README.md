# Laika Music

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React Native](https://img.shields.io/badge/React_Native-v0.7x-61DAFB.svg)](https://reactnative.dev/)

Laika Music is a high-performance, stateless music streaming and discovery application. It leverages a dual-engine architecture to provide instantaneous metadata search via the Piped API and high-fidelity audio resolution through yt-dlp, eliminating the need for a persistent database or third-party premium subscriptions.

## Architecture Overview

The system is designed as a stateless intelligence layer that orchestrates between public metadata sources and high-quality audio streams.

- **Discovery Layer**: Utilizes the Piped API for low-latency, anonymous track searching and metadata extraction.
- **Resolution Engine**: Employs a deterministic matching algorithm to align metadata with optimal audio sources.
- **Playback Pipeline**: Uses yt-dlp for asynchronous, high-accuracy audio stream extraction during the resolution phase.
- **Frontend**: A React Native application focused on performance, local audio scanning, and a modern, icon-driven user interface.

## Tech Stack

### Backend
- **Core**: FastAPI (Python 3.10+)
- **Networking**: httpx (Asynchronous HTTP client)
- **Audio Extraction**: yt-dlp
- **Schema Validation**: Pydantic v2
- **Process Management**: Uvicorn

### Mobile
- **Framework**: React Native
- **Icons**: Lucide React Native
- **State Management**: Custom Hooks + Track Player Service
- **Native Modules**: Kotlin (Android Audio Scanner)

## Project Structure

```text
laika-music/
├── backend/                # FastAPI stateless intelligence layer
│   ├── core/               # Configuration and unified schemas
│   ├── routers/            # API endpoints (Search, Resolve, Health)
│   ├── services/           # Business logic (YouTube, Matching, yt-dlp)
│   └── main.py             # Application entrypoint
├── mobile/                 # React Native cross-platform application
│   ├── src/
│   │   ├── components/     # Atomic UI components
│   │   ├── hooks/          # Shared logic and player state
│   │   ├── screens/        # Primary view layouts
│   │   └── services/       # Native bridges and API clients
└── planning/               # Project roadmap and technical specifications
```

## Getting Started

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Ensure `yt-dlp` is available in your system path.
4. Start the development server: `python -m uvicorn main:app --reload`

### Mobile Setup
1. Navigate to the mobile directory: `cd mobile`
2. Install dependencies: `npm install`
3. Start the Metro bundler: `npx react-native start`
4. Run on Android: `npx react-native run-android`

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](LICENSE) file for details.