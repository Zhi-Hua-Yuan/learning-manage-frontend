# Stage 6 frontend: controlled Agent and reports

Status: `IMPLEMENTED / CROSS-REPOSITORY RUNTIME GATE PENDING`

Implemented UI:

- `/ai-agent`: project-risk and manager-only team-workload submission.
- Exponential status polling at 1s, 2s and a 5s cap.
- Cooperative cancellation and all Agent terminal states.
- Agent report draft preview, cancel and explicit confirmation.
- Permission-shaped report list and `/ai-report/:reportId` detail.
- Stale report warning, citation navigation and logical report deletion.

Safety boundary:

- AI text and source titles use `SafeAiText`; no raw HTML rendering.
- Run, draft and report payloads are not persisted to browser storage.
- Team choices are limited to OWNER/ADMIN roles already returned by the collaboration context.
- Member-level report fields are never reconstructed client-side; the frontend renders only the backend DTO.

Verification:

```text
npm run test:ci       # 493 tests
npm run lint:ci       # storage, AI rendering, Oxlint and ESLint
npm run contract:test # 54 frontend API operations
npm run build         # Vue TypeScript and production Vite build
```

The exact backend/frontend SHA pair and runtime OpenAPI comparison remain a cross-repository CI/release responsibility.
