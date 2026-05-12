## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Architecture

- **Frontend**: React + Vite, served by nginx:1.26-alpine on port 3003, proxies `/api` to backend via internal Docker network
- **Backend**: Go + Gin, port 8083 (external) → 8080 (internal)
- **Database**: PostgreSQL 15 via `nexflow-db` container

## Known issues & fixes

- `frontend/nginx.conf`: Do NOT add `Upgrade`/`Connection` headers to `/api` proxy block — causes 403 in newer nginx
- `backend/middleware/cors.go`: Contains origin whitelist — add new local ports here when frontend port changes
- `backend/.dockerignore`: Must exclude `generate.go` to avoid duplicate `main` function build error
- `docker-compose.yml`: `VITE_API_URL` build arg must be empty (`""`) so frontend uses relative paths through nginx proxy — setting it to a hardcoded host causes browser requests to bypass nginx

## Local development credentials

- `superadmin` / `Admin123!` — full admin access (edoc + ememo)
