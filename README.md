# Laika Music

<p align="center">
  <img src="web/assets/LAIKA-README-Cover.png" alt="Laika Music Cover" width="100%">
</p>

<p align="center">
  <a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GPL v3"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.10+-blue.svg" alt="Python 3.10+"></a>
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-v0.7x-61DAFB.svg" alt="React Native"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-Protected-green.svg" alt="Security: Protected"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://github.com/mfscpayload-690/laika-music/actions/workflows/ci.yml"><img src="https://github.com/mfscpayload-690/laika-music/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://laika-music-backend.up.railway.app/health"><img src="https://img.shields.io/website?url=https%3A%2F%2Flaika-music-backend.up.railway.app%2Fhealth&label=Backend%20Status" alt="Backend Status"></a>
  <a href="https://railway.app/new/template?template=https://github.com/mfscpayload-690/laika-music"><img src="https://railway.app/button.svg" alt="Deployed on Railway" height="20"></a>
</p>

Laika Music is a high-performance, stateless music streaming and discovery application. It leverages a dual-engine architecture to provide instantaneous metadata search via the Piped API and high-fidelity audio resolution through yt-dlp, eliminating the need for a persistent database or third-party premium subscriptions.

##  Features

- **Instant Discovery**: Real-time track searching and metadata extraction using the Piped API.
- **High-Fidelity Streaming**: Optimized audio resolution and playback via yt-dlp.
- **Stateless Architecture**: No persistent database required, ensuring privacy and speed.
- **Cross-Platform Experience**: Beautifully designed mobile and web interfaces.
- **Privacy-First**: Anonymous searching and no third-party tracking.
- **Local Integration**: Native audio scanning for local music libraries.

##  Architecture

The system is designed as a stateless intelligence layer that orchestrates between public metadata sources and high-quality audio streams.

- **Discovery Layer**: Utilizes the Piped API for low-latency, anonymous track searching and metadata extraction.
- **Resolution Engine**: Employs a deterministic matching algorithm to align metadata with optimal audio sources.
- **Playback Pipeline**: Uses yt-dlp for asynchronous, high-accuracy audio stream extraction during the resolution phase.
- **Frontend**: A React Native application focused on performance, local audio scanning, and a modern, icon-driven user interface.

## Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Networking**: [httpx](https://www.python-httpx.org/) (Asynchronous HTTP client)
- **Audio Extraction**: [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/)

### Frontend (Mobile & Web)
- **Framework**: [React Native](https://reactnative.dev/) / [React](https://reactjs.org/)
- **Styling**: Vanilla CSS / Tailwind CSS
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks & Custom Services

## Project Structure

```text
laika-music/
├── backend/                    # FastAPI Stateless Intelligence Layer
│   ├── core/                   # Application config, schemas, and security
│   ├── routers/                # API route handlers (Search, Resolve, Health)
│   ├── services/               # Orchestration logic (YouTube, Matching, yt-dlp)
│   ├── main.py                 # ASGI application entrypoint
│   └── requirements.txt        # Backend dependencies
├── mobile/                     # React Native Cross-Platform Application
│   ├── android/                # Native Android implementation (Kotlin/Java)
│   ├── src/
│   │   ├── components/         # Reusable UI components & atomic design
│   │   ├── hooks/              # Custom React hooks (Player state, API)
│   │   ├── screens/            # Full-page view components
│   │   ├── services/           # Native bridges & background audio services
│   │   ├── types/              # TypeScript interfaces & domain models
│   │   └── theme.ts            # Global design tokens
│   ├── App.tsx                 # Root application component
│   └── package.json            # Mobile dependencies & scripts
├── web/                        # Web Frontend (React)
├── .github/                    # GitHub configuration & workflows
└── README.md                   # Project documentation
```

##  Getting Started

### Prerequisites
- Python 3.10+
- Node.js & npm
- `yt-dlp` installed in your system path

### Backend Setup
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python -m uvicorn main:app --reload`

### Mobile Setup
1. `cd mobile`
2. `npm install`
3. `npx react-native start`
4. `npx react-native run-android` # For Android development

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for our development workflow and style guidelines.

##  Security

We take security seriously. Please report any vulnerabilities privately. See [SECURITY.md](SECURITY.md) for more information.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the Laika Music Community.
