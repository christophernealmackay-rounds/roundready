from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.users import router as users_router
from app.api.v1.departments import router as departments_router
from app.api.v1.residents import router as residents_router
from app.api.v1.resident_groups import router as resident_groups_router
from app.api.v1.angels import router as angels_router
from app.api.v1.qapis import router as qapis_router
from app.api.v1.questions import router as questions_router
from app.api.v1.issues import router as issues_router
from app.api.v1.rounds import router as rounds_router
from app.api.v1.reports import router as reports_router
from app.api.v1.qaa_notes import router as qaa_notes_router
from app.api.v1.qaa_meeting_notes import router as qaa_meeting_notes_router
from app.api.v1.admin import router as admin_router

app = FastAPI(title="RoundReady API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(health_router,           prefix=PREFIX)
app.include_router(users_router,            prefix=PREFIX)
app.include_router(departments_router,      prefix=PREFIX)
app.include_router(residents_router,        prefix=PREFIX)
app.include_router(resident_groups_router,  prefix=PREFIX)
app.include_router(angels_router,           prefix=PREFIX)
app.include_router(qapis_router,            prefix=PREFIX)
app.include_router(questions_router,        prefix=PREFIX)
app.include_router(issues_router,           prefix=PREFIX)
app.include_router(rounds_router,           prefix=PREFIX)
app.include_router(reports_router,          prefix=PREFIX)
app.include_router(qaa_notes_router,        prefix=PREFIX)
app.include_router(qaa_meeting_notes_router, prefix=PREFIX)
app.include_router(admin_router,            prefix=PREFIX)
