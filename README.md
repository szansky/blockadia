# Blockadia

Initial scaffold for Blockadia, a 2D top-down nation-building game with online cooperation and rivalry.
This repo contains the first drop: frontend (Vite + React + Phaser + Tailwind), backend (FastAPI), and a Dockerized PostgreSQL database.

## Stack
- Frontend: Vite + React + Phaser + Tailwind
- Backend: FastAPI (Python)
- Database: PostgreSQL (Docker)

## Getting Started

### 1) Database (Docker)
```bash
docker compose up -d
```

Default credentials (local only):
- user: `blockadia`
- password: `blockadia`
- db: `blockadia`

### 2) Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3) Frontend (Vite + React + Phaser)
```bash
cd frontend
npm install
npm run dev
```

## Project Structure
```
backend/         FastAPI app
frontend/        Vite + React + Phaser client
  src/game/      Phaser scene and game setup

docker-compose.yml  PostgreSQL container
```

## Notes on Sensitive Data
- Do NOT commit real secrets or production credentials.
- Local env files are ignored by default (`.env`, `backend/.env`).
- If you add new secret files, extend `.gitignore` accordingly.

## Next Steps (Suggested)
- Add database connection layer (asyncpg) and initial schemas.
- Define game tick and initial world state models.
- Add websocket sync for realtime state updates.

---

This is the first drop for Blockadia and will evolve quickly.
