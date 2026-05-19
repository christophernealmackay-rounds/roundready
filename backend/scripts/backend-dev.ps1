# Start the RoundReady backend in dev mode (hot reload on :8000).
# Usage:  .\scripts\backend-dev.ps1            # DEMO_MODE on (seed-reset endpoint available)
#         .\scripts\backend-dev.ps1 -NoDemo    # DEMO_MODE off
param([switch]$NoDemo)

$ErrorActionPreference = "Stop"

# Run from the backend root so the "app.main:app" import path resolves.
$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

if (-not $NoDemo) { $env:DEMO_MODE = "true" }

# Use the `py` launcher: on Windows the bare `python` is often a broken
# Microsoft Store alias, while `py` resolves to the real interpreter.
# Supabase creds (DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) load from backend/.env.
py -m uvicorn app.main:app --reload --port 8000
