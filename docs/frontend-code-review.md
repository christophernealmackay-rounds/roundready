# Frontend Code Review — simplification & over-defensive programming

**Scope:** all of `frontend/src` (pages, components, lib). **Lens (as requested):** simplification opportunities and overly defensive programming only — not bugs/security/tests in general.
**Method:** 3 parallel reviewers (pages / components / lib), then findings verified against the actual source and `schema.d.ts` before inclusion. Nitpicks, lint/typechecker-catchable items, and unverified speculation were dropped.
**Date:** 2026-05-18. Reviewed at branch `feat/angel-flag-notes`.

CLAUDE.md is explicit here: *"Keep it simple – always keep it simple, do not over-engineer, keep defensive programming simple and only use when absolutely necessary."* The findings below are framed against that standard.

---

## A. Overly defensive programming (verified against schema.d.ts)

These `?? <default>` guards in `frontend/src/lib/api/mappers.ts` are on fields the OpenAPI contract types as **required and non-null** (confirmed in `schema.d.ts`). They are dead defensive code — the fallback can never be taken — and obscure the actual data contract. Safe to drop because the backend Pydantic models make these fields non-Optional with defaults, so FastAPI always serializes them (the schema marking them required is the proof).

| Mapper | Line | Current | Schema type | Fix |
|---|---|---|---|---|
| `mapQaaMeetingNote` | ~239–240 | `n.title ?? ''`, `n.content ?? ''` | `title: string`, `content: string` | `n.title`, `n.content` |
| `mapQapi` | ~97 | `(q.items ?? []).map(...)` | `items: QapiItemOut[]` | `q.items.map(...)` |
| `mapTemplateSection` | ~140 | `(s.questions ?? []).map(...)` | `questions: TemplateQuestionOut[]` | `s.questions.map(...)` |
| `mapRoundTemplate` | ~153–155 | `t.rapid_completion_count ?? 0`, `(t.sections ?? []).map(...)` | `rapid_completion_count: number`, `sections: TemplateSectionOut[]` | drop both `??` |
| `mapQuestion` / `mapTemplateQuestion` | ~109 / ~125 | `(q.type ?? 'yesno') as ...` | `type: string` (both) | `q.type as ...` |
| `mapResidentGroup` | ~228 | `g.member_ids ?? []` | `member_ids: string[]` | `g.member_ids` |

**Not a finding (verified legitimate, keep as-is):** `formatDate`'s `if (!s) return ''` guard in `lib/dates.ts` — real call sites pass nullable-origin strings (e.g. `QapiItem.startDate`), so this guard is necessary boundary defense, not over-defensive. Likewise `mappers.ts` mapping nullable API fields (`resolved_at`, `facility_id`, etc.) to domain defaults is correct boundary normalization and was excluded.

Other (lower-value) over-defensive spots:
- `AngelRoundFlow.tsx` ~406 — `currentResident?.name ?? ""` in the `"done"` step; `currentResident` is guaranteed by then (resident was picked and a round submitted). Minor; capture the name before `setStep("done")` rather than guard an impossible null.

---

## B. Simplification — duplicated logic worth extracting

1. **`ini()` helper duplicated in 4 files** — `dashboard/page.tsx:29` (variant, missing `.slice(0,2)`), `angels/page.tsx:14`, `residents/page.tsx:14`, `users/page.tsx:15`. Note `lib/auth/currentUser.ts` already exports `initials` — consolidate all four to that one import (and fix the dashboard variant's divergence).

2. **Range→start-date IIFE duplicated** — `dashboard/page.tsx` lines ~181–185 and ~213–216 (two consecutive memos). `reports/page.tsx` already has a `rangeStart(range)` helper; extract/share one helper and use it in all three memos.

3. **Add User / Edit User modals** — `users/page.tsx` ~141–219: ~60 lines of near-identical 2×2 form markup (Name/Email/Role/Department). Extract a `UserForm` field block; collapse the two modals into one with a `mode` prop.

4. **Angel-Rounds vs Rapid-Round question row** — `rounds/page.tsx` ~382–412 vs ~518–540: the per-question row (grip + text + FlagPill + notify dept + Edit/Remove) is copy-pasted. Extract `TemplateQuestionRow`.

5. **`qapiBars` and `targetQapis` repeat the same filter** — `reports/page.tsx` ~192 and ~214 run the identical `selectedQapi === "All QAPIs" ? q.status==="active" : q.title===selectedQapi` predicate. Compute `targetQapis` once, then `qapiBars = targetQapis.map(...)`.

6. **Topbar gear SVG duplicated verbatim** — `Topbar.tsx` ~171 and ~263. Extract a `GearIcon` component.

7. **Topbar "Save all settings" button rendered twice** — `Topbar.tsx` ~333 and ~481. The two render positions (top + bottom of a long panel) are an intentional UX choice, but the full button markup/style is copy-pasted; hoist to a single `const saveBtn = (...)` / small component and render it at both spots.

---

## C. Simplification — structure, dead code, determinism

1. **Spurious `range` dependency** — `dashboard/page.tsx:133`: the large `useMemo` (lines ~51–133) builds the KPI/chart maps for *all* ranges and is indexed later via `kpi[range]`; `range` is **not read inside the memo** (verified). Listing `range` in its deps re-runs the entire all-ranges computation on every range toggle. Remove `range` from that dep array (keep it in the `qapiKpis`/`qapiItemKpis` memos, which *do* read it).

2. **`fmt` in `qapi/page.tsx:12–14` has an invalid option key + a cast that hides it** — `{ month:"short", day:"numeric", yyyy:"numeric" } as Intl.DateTimeFormatOptions`. `yyyy` is not a valid `Intl.DateTimeFormatOptions` key (correct key is `year`), so the year is silently dropped from the output, and the `as` cast suppresses the type error that would have caught it. `formatDate` from `lib/dates.ts` is already imported in this file — delete the local `fmt` and use `formatDate`. (This is also a latent correctness bug, surfaced under the simplification lens.)

3. **`AngelRoundFlow.tsx` ~136–147 — placeholder-value typing hack** — a `submissionEntry` const is created solely to name a type via `typeof submissionEntry[]`, requiring an `eslint-disable`. Declare `type SubmissionEntry = {...}` and use `SubmissionEntry[]` directly; delete the placeholder and the lint suppression.

4. **`AngelRoundFlow.tsx` ~363–377 — IIFE for a 1-line derived bool** — the Submit button wraps `(() => { const blocked = ...; return <button/> })()`. Hoist `const submitBlocked = value === undefined || flaggedNoteMissing;` next to the other derived booleans (`flaggedNow`, `currentBlocked`) and drop the IIFE.

5. **`Topbar.tsx` ~304–328 — dept-routing IIFE** — a `(() => {...})()` computes counts/rows then returns JSX. Hoist to a `useMemo`-derived `deptRoutingRows`; render with a plain conditional.

6. **`Topbar.tsx` ~75–78 — four sibling toggle `useState`s** — `emailTogg/pushAdminTogg/smsTogg/pushAngelTogg` are ephemeral demo state never persisted or reset on panel reopen (unlike `capacity`, which has a sync effect). Collapse to one `useState({...})` object for consistency and so they can reset together.

7. **`useAngelsStore.ts` ~48–59 — IIFE inside `Promise.all`** — `(async () => set({ angels: await listAngels() }))()` in `returnToDuty`/`redistribute`. Cleaner as `const [, angels] = await Promise.all([useResidentsStore.getState().refresh(), listAngels()]); set({ angels });` — same concurrency, no IIFE.

8. **`GroupManager.tsx` ~64–73 — `let` + reassignment** — `let groupId = editingId; if (!groupId) { ... groupId = g.id }` → `const groupId = editingId ?? (await createGroup(name.trim(), "cart")).id;`.

9. **`reports/page.tsx:626 — `Math.random()` in render** — `Document #{Math.floor(Math.random()*9000+1000)}` recomputes every render (changes on any state change). Use a `useState(() => …)` initializer so the document number is stable per mount.

### Minor / optional (low value — listed for completeness, a senior may skip)
- `dashboard/page.tsx` — `new Date(i.resolvedAt)` constructed twice in the same `resolvedToday` predicate (and similar in week/month chart builders). Trivial micro-tidy.
- `angels/page.tsx` ~63–119 — `kpiCards` array carries `id`/`color` fields that the render ignores (it re-derives `filterId`/`accent` from the index). Either use the array fields or drop them.
- `angels/page.tsx` ~229–230 — `residentCount(absentModal.id)` evaluated twice in one sentence; store in a local.
- `reports/page.tsx` ~144–154 — `effectiveStart`/`effectiveEnd` are called once each inside one memo; inline them.
- `issues/page.tsx` ~12–15 — local `fmt` duplicates `formatDate` (diverged UTC handling; doesn't currently misfire because inputs are full ISO timestamps). Replace with the shared `formatDate`.
- `mappers.ts` `mapRound` — the triple-nested inline `as unknown as {answers?: …}` cast is a necessary boundary cast (the inline-answers payload isn't in the OpenAPI spec); extract a named `RoundOutWithAnswers` interface for readability.
- `rounds/page.tsx:56` — `const fmt = formatDate` alias adds indirection; use `formatDate` directly.

---

## Prioritized recommendation

1. **Section A** (mapper `??` guards) — highest signal for the requested "over-defensive" lens; ~9 one-token deletions, verified safe, directly aligns with CLAUDE.md. Do these first.
2. **C2** (qapi `fmt` `yyyy`) — fix the latent date bug while simplifying to `formatDate`.
3. **C1** (dashboard spurious `range` dep) — small change, removes wasted recompute on every range toggle.
4. **B1–B7 / C3–C9** — solid de-duplication and dead-code removal; batch into one "frontend tidy" change.
5. Minor/optional — only if touching those files anyway.

Nothing here is a correctness regression risk except C2 (already a latent bug). All Section A removals are type-safe per `schema.d.ts`; run `tsc` + the vitest mapper round-trip tests after to confirm.
