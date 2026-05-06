from fastapi import APIRouter, Depends
import httpx

from app.db.client import get_db
from app.seed.seed_data import run_seed

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("/reset", status_code=200)
async def reset_seed(client: httpx.AsyncClient = Depends(get_db)):
    """Clear and re-seed QAPI/department/angel tables. Demo use only."""
    result = await run_seed(client)
    return {"status": "ok", "seeded": result}
