# Backend Code Review — Over-Defensive Programming & Simplification Audit

Scope: every Python file under `backend/app/` (routes, schemas, db layer, seed, main).
Lens: CLAUDE.md Coding Standard #2 — *"Keep it simple – always keep it simple, do not over-engineer, keep defensive programming simple and only use when absolutely necessary."* and *"Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries."*

## Summary

Overall assessment: **the backend is already quite clean and disciplined.** There are no broad `except Exception` blocks, no catch-and-rethrow, no catch-and-ignore, and the N+1-avoiding batch helpers are genuinely warranted. Validation mostly lives where it should (Pydantic at the boundary). The findings below are mostly small redundancies and one piece of genuinely dead code, not systemic over-engineering.

Findings by priority:

| Priority | Count |
|---|---|
| High | 2 |
| Medium | 4 |
| Low | 4 |

The two High findings are: a fully dead SQLAlchemy DB module, and the duplicated scale-shape validator that re-implements logic already enforceable far more simply. Medium findings are repeated `if not rows: 404` existence-check boilerplate, an unused module constant, redundant per-field PATCH unpacking that the `model_dump(exclude_unset=True)` idiom already solves elsewhere in the same codebase, and a redundant defensive guard in the seed renderer.

---

## High

### H1 — Dead SQLAlchemy DB layer (`app/db/session.py`)

`app/db/session.py` defines a SQLAlchemy async engine, `async_sessionmaker`, a `Base` declarative class, and a `get_db()` generator:

```python
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        yield session
```

Nothing in the request path uses any of it. Every route imports `get_db`/`DB` from `app.db.client` (the PostgREST httpx client). A repo-wide grep shows the only consumer of `app.db.session` is `backend/alembic/env.py`, which imports `Base` — and CLAUDE.md explicitly states *"alembic is dormant — don't add migrations"*.

Why it matters: this is dead code that creates a second, live DB engine (`create_async_engine` runs at import time) and a misleading second `get_db` with the same name as the real one — a real trap for anyone navigating the codebase. Directly violates "keep it simple."

Suggested simplification: delete `engine`, `async_session`, and `get_db` from `app/db/session.py`. Keep only the `Base` class that dormant alembic needs:

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

(If alembic is truly never going to run, the whole file plus `alembic/` could go, but that is outside this audit's scope and worth a separate explicit decision.)

### H2 — Hand-rolled scale-shape validator duplicates what Pydantic field constraints express (`app/schemas/question.py:16-48`)

`_validate_scale_shape` is a 33-line free function manually checking presence, type, and range of four scale fields, invoked from two `@model_validator(mode="after")` hooks:

```python
def _validate_scale_shape(qtype, scale_min, scale_max, scale_threshold, scale_threshold_direction) -> None:
    if qtype == "scale":
        missing = [name for name, value in (...) if value is None]
        if missing:
            raise ValueError(f"scale questions require: {', '.join(missing)}")
        if scale_min >= scale_max:  # type: ignore[operator]
            raise ValueError("scale_min must be less than scale_max")
        if not (scale_min <= scale_threshold <= scale_max):  # type: ignore[operator]
            raise ValueError(...)
    elif qtype == "yesno":
        for name, value in (...):
            if value is not None:
                raise ValueError(f"{name} must be null for yes/no questions")
```

The cross-field rule ("scale needs these four; yesno forbids them; threshold between min and max") is genuine boundary validation and is fine to keep as a `model_validator`. But the implementation is more verbose than it needs to be, carries three `# type: ignore[operator]` comments (a smell that the structure is fighting the type system), and the "must be null for yes/no" branch is arguably defensive validation for input the UI never produces.

Why it matters: the `# type: ignore` x3 plus the manual `missing = [...]` list-building is exactly the kind of belt-and-suspenders verbosity Standard #2 targets.

Suggested simplification: keep one `model_validator` per model but collapse the helper to the essential cross-field assertions, and drop the "yesno forbids scale fields" branch (the DB has no CHECK requiring it, the UI never sends it, and `_compute_flagged` already ignores scale fields for `yesno`). Roughly:

```python
@model_validator(mode="after")
def _validate(self):
    if self.type != "scale":
        return self
    if None in (self.scale_min, self.scale_max, self.scale_threshold, self.scale_threshold_direction):
        raise ValueError("scale questions require scale_min, scale_max, scale_threshold, scale_threshold_direction")
    if not self.scale_min < self.scale_threshold <= self.scale_max and not self.scale_min <= self.scale_threshold < self.scale_max:
        raise ValueError("scale_threshold must lie between scale_min and scale_max")
    return self
```

(At minimum: remove the `yesno`-forbids branch and the `# type: ignore` churn by guarding with an early `if self.type != "scale": return`.)

---

## Medium

### M1 — Repeated "fetch row then 404" existence-check boilerplate (across most route files)

The pattern below appears ~20 times across `users.py`, `departments.py`, `residents.py`, `resident_groups.py`, `qapis.py`, `questions.py`, `issues.py`, `rounds.py`, `qaa_meeting_notes.py`:

```python
rows = await db.select("users", {"id": f"eq.{user_id}"})
if not rows:
    raise HTTPException(404, "User not found")
```

For pure DELETE handlers this is an **extra round-trip purely to produce a 404** — e.g. `delete_user`, `delete_department`, `delete_group`, `delete_qapi`, `delete_item`, `delete_question`, `delete_template`, `delete_section`, `remove_question_from_section`, `delete_round`. PostgREST DELETE with `Prefer: return=representation` already tells you whether anything matched; the pre-SELECT is a defensive existence check before an operation that is itself idempotent.

Why it matters: this is the single most repeated piece of boilerplate in the backend and several instances are redundant DB hops (the "unnecessary existence checks before operations" anti-pattern called out in the task).

Suggested simplification (two options, pick per-route):

- For DELETEs where a 404-on-missing isn't a hard product requirement: just issue the delete. `db.delete` already raises on a PostgREST error; a missing row is a harmless no-op and the client gets 204 either way.
- Where the 404 *is* desired, add one small helper to `app/db/client.py` and call it, removing the repeated 2-line block:

```python
async def get_or_404(self, table: str, id_: str, name: str) -> dict:
    rows = await self.select(table, {"id": f"eq.{id_}"})
    if not rows:
        raise HTTPException(404, f"{name} not found")
    return rows[0]
```

This is one of the few places a helper genuinely reduces complexity rather than adding an abstraction — it is duplicated verbatim ~20 times.

### M2 — Unused module constant `FACILITY_ID` in `residents.py:11`

```python
FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"
```

Nothing in `residents.py` references it (verified by grep — the only `FACILITY_ID` uses in that file is the definition itself). Dead constant copied from the qaa/facility routes.

Suggested simplification: delete the line.

### M3 — `update_template` / `update_section` hand-unpack each field instead of using the project's own established PATCH idiom (`rounds.py:186-201`, `rounds.py:278-290`)

```python
payload: dict = {}
if body.name is not None:
    payload["name"] = body.name
if body.active is not None:
    payload["active"] = body.active
if body.start_date is not None:
    payload["start_date"] = body.start_date.isoformat()
if body.end_date is not None:
    payload["end_date"] = body.end_date.isoformat()
if body.archived_at is not None:
    payload["archived_at"] = body.archived_at.isoformat()
```

This is verbose per-field unpacking. The same codebase already uses the concise idiomatic form elsewhere — `questions.py:61` (`body.model_dump(exclude_unset=True)`) and `qaa_meeting_notes.py:62` — with a small loop to `.isoformat()` date fields.

Why it matters: ~12 lines of branch boilerplate per handler reproducing what one `model_dump(exclude_unset=True)` plus a tiny date-coercion loop does. Standard #2 ("be concise", "keep it simple"), and the codebase already has the better pattern.

Suggested simplification (mirrors `qaa_meeting_notes.update_note`):

```python
data = body.model_dump(exclude_unset=True)
for f in ("start_date", "end_date", "archived_at"):
    if data.get(f) is not None:
        data[f] = data[f].isoformat()
t = await db.update("round_templates", {"id": str(template_id)}, data) if data else rows[0]
```

Same treatment for `update_section` (`title`, `qapi_id`, `qapi_item_id`, `order` → `model_dump(exclude_unset=True)` + str() the two UUIDs).

### M4 — `_substitute` defensively checks for a missing placeholder argument that "can't happen" (`app/seed/sql_render.py:57-64`)

```python
def repl(m):
    idx = int(m.group(1)) - 1
    if idx >= len(args):
        raise ValueError(f"Missing argument for placeholder ${idx + 1} in SQL: {sql!r}")
    return _format_value(args[idx])
```

The seed is internal, fully controlled code (`seed_data.py`); every `$n` placeholder is paired with its arg in the same file. Indexing past `args` would already raise `IndexError` with a perfectly clear traceback. This is a hand-rolled re-raise of a built-in error for a scenario that can only occur if the seed itself is broken — exactly "validation for scenarios that can't happen" / "trust internal code."

Suggested simplification: drop the guard, let `args[idx]` raise:

```python
def repl(m):
    return _format_value(args[int(m.group(1)) - 1])
```

---

## Low

### L1 — `DB.insert` / `DB.update` return-shape fallbacks (`app/db/client.py:95, 107`)

```python
rows = r.json()
return rows[0] if rows else data        # insert
return rows[0] if rows else {}          # update
```

All callers send `Prefer: return=representation`, so PostgREST always returns the row(s) on success and `raise_for_status()` has already fired on failure. The `else data` / `else {}` fallbacks are defending against a response shape that doesn't occur. Minor — keeping a safe default here is low-risk and the simplification payoff is small, so this is Low. If touched, `return rows[0]` is sufficient.

### L2 — `resolver.get("active", True)` / `.get("role")` defensive defaults (`issues.py:122-124`)

```python
if not resolver.get("active", True):
    raise HTTPException(403, "resolved_by user is inactive")
role = resolver.get("role")
```

`resolver` is a freshly-fetched `users` row; `active` and `role` are NOT NULL columns in the schema, so `.get(..., default)` and `.get(...)` are guarding against a row shape the DB guarantees. The user-existence + role check itself is legitimate boundary auth (keep it). Just `resolver["active"]` / `resolver["role"]` would be the trust-the-schema form. Low because the auth block as a whole is correctly placed and the defensiveness is one keystroke.

### L3 — `_serialize_item` `hasattr(..., "isoformat")` double-guard (`qapis.py:19-25`)

```python
for k in ("start_date", "expected_completion"):
    if out.get(k):
        out[k] = out[k].isoformat() if hasattr(out[k], "isoformat") else out[k]
```

These keys come from `QapiItemCreate`/`QapiItemUpdate` where the fields are typed `datetime.date | None`. After the `if out.get(k)` truthiness check the value is always a `date`, so the `hasattr(...) else out[k]` branch is unreachable defensive code. `out[k] = out[k].isoformat()` suffices. Low impact (one expression) but it is textbook belt-and-suspenders.

### L4 — `list_issues` status filter silently narrows instead of trusting the type (`issues.py:56`)

```python
if status in ("open", "resolved"):
    params["status"] = f"eq.{status}"
```

`status` is an untyped `str | None` query param, so this membership check is reasonable boundary input handling — but it silently ignores an invalid value rather than 422-ing, which is inconsistent with the Pydantic `Literal` discipline used everywhere else. Not over-defensive per se; flagged Low only as a consistency note. Typing the param as `Literal["open", "resolved"] | None = None` lets FastAPI validate it and removes the manual check. (Do **not** add error handling here — this is a swap, not an addition.)

---

## Things deliberately NOT flagged (already correct)

- The batched enrichment helpers (`list_angels`, `list_issues`, `list_rounds`, `_build_template_outs`, `reports.get_report`) — the N+1 avoidance is real and the code is appropriately direct.
- `qapis.update_qapi`'s `model_fields_set` / force-clear-`actual_completion` special case — this is intentional documented business logic, not defensive cruft, and CLAUDE.md explicitly cites it as the canonical pattern.
- Pydantic `Literal` enums mirroring Postgres CHECK constraints — this is correct boundary validation that turns 500s into 422s; it is *not* redundant with the DB constraint because the value is the user-facing error contract.
- `submit_round` server-side flag recomputation + `flag_notes` requirement — legitimate boundary validation of untrusted client input.
- `_require_demo_mode()` gate in `admin.py` — correct, minimal, single-purpose.
- `select_all` pagination in `client.py` — necessary for the >1000-row `round_answers` table; the early-return-on-caller-limit branch is justified and documented.
