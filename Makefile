# RoundReady demo + dev orchestration

.PHONY: demo-reset backend-dev backend-test frontend-dev frontend-test

# Drop all tables, recreate from db/schema.sql, load authoritative demo seed.
# Run between demos to return to a known state.
demo-reset:
	cd backend && python -m scripts.reset_demo

backend-dev:
	cd backend && uvicorn app.main:app --reload --port 8000

backend-test:
	cd backend && pytest -v

frontend-dev:
	cd frontend && npm run dev

frontend-test:
	cd frontend && npm test
