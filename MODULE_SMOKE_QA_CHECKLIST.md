# Module Smoke QA Checklist

Date: 2026-03-18 04:33:07 UTC
Environment: Local API at `http://127.0.0.1:3001` with PostgreSQL `chamaPlus`
Scope: loans, assets, reports, arrears endpoints

## Preconditions

- Backend started successfully on port `3001`
- Database connection established
- Auth token obtained via `POST /api/auth/register` for protected endpoints
- Valid `chama_id` resolved from `GET /api/chamas`

## Checklist Results

- [x] Loans list: `GET /api/loans?chama_id={id}` returned `200`
- [x] Loans summary: `GET /api/loans/summary/stats?chama_id={id}` returned `200`
- [x] Assets list: `GET /api/assets?chama_id={id}` returned `200`
- [x] Assets summary: `GET /api/assets/summary/stats?chama_id={id}` returned `200`
- [x] Assets net worth: `GET /api/assets/networth?chama_id={id}` returned `200`
- [x] Reports financial statement: `GET /api/reports/financial-statement?...&format=pdf` returned `200`
- [x] Reports loan portfolio: `GET /api/reports/loan-portfolio?...&format=pdf` returned `200`
- [x] Arrears obligations list: `GET /api/contributions/obligations?chama_id={id}` returned `200`
- [x] Arrears members in arrears: `GET /api/contributions/arrears?chama_id={id}` returned `200`
- [x] Arrears stats: `GET /api/contributions/obligations/stats?chama_id={id}` returned `200`

## Outcome

- Smoke pass rate: **10/10**
- No blocking regressions observed in the tested module flows.
- Assets and reports routes now degrade safely when optional schema tables are absent.
