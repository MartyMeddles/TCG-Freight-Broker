# Plan: TCG Freight Broker Full-Stack Rebuild

Rebuild the vanilla HTML prototype (see `TCG-FreightBroker-functionality.md`) as a production-quality monorepo: React+TS+Vite SPA, ASP.NET Core 8 Web API, SQL Server + EF Core, SignalR for live load/decision/audit feeds, JWT auth with dual password/PIN support, and a server-side `BackgroundService` that runs the auto-booking loop. Target **full feature parity** with the prototype, including batch simulation, manual load tester, step-through mode, and integration-configuration scaffolding (DAT / e2open / IMAP stubs with pluggable providers). Ship with devcontainer, Docker Compose SQL Server, GitHub Actions CI, xUnit + Vitest + Playwright tests, and a comprehensive README.

---

## Decisions (locked)
- **Scope:** Full parity with the functionality doc.
- **Auth:** JWT bearer (access + rotating refresh cookie).
- **Login model:** Configurable — username+password (ASP.NET Identity, hashed) AND username+PIN (hashed, rate-limited). Mode chosen per user or via config.
- **Solution:** Keep existing `TCG-FreightBroker-Package.sln` and populate.
- **SignalR surface:** Load board updates, auto-booking loop events, audit feed.
- **Auto-booking loop:** Server-side `IHostedService` / `BackgroundService`, toggled via admin API, broadcasts over SignalR.
- **Frontend styling:** Tailwind CSS (closest to prototype's utility-style markup) + shadcn/ui primitives.
- **State mgmt:** TanStack Query for server state, Zustand for local UI state.
- **Versioning:** Start at `0.1.0` (pre-1.0 during rebuild). Bump to `0.2.0` as phases land; `1.0.0` when full parity + E2E green.

---

## Proposed Folder Structure

```
TCG-FreightBroker-Package/
├─ TCG-FreightBroker-Package.sln
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ user-guide.md
│  ├─ troubleshooting.md
│  └─ decision-engine.md
├─ .devcontainer/
│  ├─ devcontainer.json
│  └─ Dockerfile
├─ .github/workflows/
│  ├─ ci.yml
│  └─ codeql.yml
├─ docker-compose.yml                      # SQL Server + (optional) api/web
├─ .editorconfig  .gitignore  .gitattributes
├─ Directory.Build.props                   # shared C# settings
├─ global.json                             # .NET SDK pin
├─ package.json                            # root workspace (pnpm) for scripts
├─ pnpm-workspace.yaml
├─ Taskfile.yml OR just commands doc
├─ scripts/
│  ├─ dev-up.ps1  dev-up.sh               # one-command full-stack start
│  ├─ db-reset.ps1  db-reset.sh
│  └─ seed.ps1  seed.sh
├─ src/
│  ├─ api/
│  │  ├─ TCG.FreightBroker.Api/                    # ASP.NET Core Web API host
│  │  │  ├─ Program.cs  appsettings*.json
│  │  │  ├─ Controllers/ (Auth, Users, Clients, Lanes, Loads, Decisions,
│  │  │  │                Parameters, Audit, Simulation, StepThrough,
│  │  │  │                Integrations, Config, Health)
│  │  │  ├─ Hubs/ (LoadsHub, AuditHub)
│  │  │  ├─ Middleware/ (ExceptionHandler, CorrelationId, RequestLogging,
│  │  │  │               RateLimiting)
│  │  │  ├─ Filters/ (ValidationFilter, AuditActionFilter)
│  │  │  └─ Extensions/ (ServiceCollection, WebApplication)
│  │  ├─ TCG.FreightBroker.Application/            # use-cases, services, DTOs
│  │  │  ├─ Common/ (Result<T>, Paged<T>, Errors, Validation)
│  │  │  ├─ Auth/          (LoginHandler, RefreshHandler, PinLoginHandler,
│  │  │  │                  JwtTokenService, PasswordHasher, PinHasher)
│  │  │  ├─ Users/         (CRUD, role policies)
│  │  │  ├─ Clients/       (CRUD, lane assignment, GP override resolution)
│  │  │  ├─ Lanes/         (catalog, DAT reference view, drilldown analytics)
│  │  │  ├─ Loads/         (generation, board queries, detail, CSV export)
│  │  │  ├─ Decisions/     (queue ops, manual accept/reject, bulk actions,
│  │  │  │                  confirmation tokens)
│  │  │  ├─ DecisionEngine/  *** core domain service, pure, deterministic ***
│  │  │  │                 (RuleSet, RuleResult, Recommendation, Scoring)
│  │  │  ├─ AutoBooking/   (loop coordinator; consumed by hosted service)
│  │  │  ├─ ContractTracker/ (weekly fulfillment, risk scoring, KPIs)
│  │  │  ├─ Parameters/    (global thresholds, per-client overrides)
│  │  │  ├─ Simulation/    (batch sim, result aggregation)
│  │  │  ├─ StepThrough/   (session state, agreement metrics)
│  │  │  ├─ ManualTester/  (hypothetical load eval)
│  │  │  ├─ Audit/         (event recording, query, CSV export)
│  │  │  ├─ Integrations/  (DAT, e2open, IMAP provider abstractions + stubs)
│  │  │  └─ Config/        (export/import state)
│  │  ├─ TCG.FreightBroker.Domain/                 # entities, value objects, rules
│  │  │  ├─ Loads/  Lanes/  Clients/  Users/  Audit/  Parameters/
│  │  │  ├─ Weeks/  (FiscalWeek, BookingState)
│  │  │  └─ Common/ (Entity, AggregateRoot, Enums)
│  │  ├─ TCG.FreightBroker.Infrastructure/         # EF Core, identity, SignalR impl, providers
│  │  │  ├─ Persistence/AppDbContext.cs
│  │  │  ├─ Persistence/Configurations/
│  │  │  ├─ Persistence/Migrations/
│  │  │  ├─ Persistence/Seed/
│  │  │  ├─ Persistence/Repositories/
│  │  │  ├─ Identity/ (AppUser, RoleSeed)
│  │  │  ├─ RealTime/ (SignalR broadcast adapter impl)
│  │  │  ├─ Integrations/ (DatRatesClient, E2openClient, ImapClient + stubs)
│  │  │  ├─ BackgroundServices/ (AutoBookingHostedService)
│  │  │  └─ Logging/ (Serilog sinks, enrichers)
│  │  └─ TCG.FreightBroker.Contracts/              # shared DTOs + TS gen source
│  │     └─ (public request/response records)
│  ├─ web/
│  │  ├─ package.json  vite.config.ts  tsconfig*.json
│  │  ├─ index.html
│  │  ├─ tailwind.config.ts  postcss.config.js
│  │  ├─ .env.example
│  │  ├─ src/
│  │  │  ├─ main.tsx  App.tsx  router.tsx
│  │  │  ├─ api/            (generated types + axios client + react-query hooks)
│  │  │  ├─ auth/           (AuthProvider, login, role guards, PIN vs password)
│  │  │  ├─ realtime/       (SignalR hooks: useLoadsFeed, useAuditFeed)
│  │  │  ├─ components/ui/  (shadcn primitives)
│  │  │  ├─ components/     (LoadCard, ConfirmCountdown, RuleTrace, KpiCard…)
│  │  │  ├─ features/
│  │  │  │  ├─ dashboard/        (header, fill score, auto toggle)
│  │  │  │  ├─ load-board/
│  │  │  │  ├─ decisions-queue/  (bulk select, batch confirm bar)
│  │  │  │  ├─ contract-tracker/
│  │  │  │  ├─ lane-drilldown/
│  │  │  │  ├─ manual-tester/
│  │  │  │  ├─ parameters/
│  │  │  │  ├─ simulation/
│  │  │  │  ├─ step-through/
│  │  │  │  ├─ dat-rates/
│  │  │  │  ├─ clients/
│  │  │  │  ├─ users/            (admin only)
│  │  │  │  ├─ integrations/
│  │  │  │  ├─ audit/
│  │  │  │  └─ config/           (export/import)
│  │  │  ├─ lib/            (format, fiscal-week, confirm-countdown hook)
│  │  │  ├─ styles/
│  │  │  └─ types/
│  │  └─ tests/             (Vitest unit + RTL integration)
│  └─ e2e/
│     ├─ package.json  playwright.config.ts
│     └─ tests/            (login, navigate, basic-crud smoke)
└─ tests/
   ├─ TCG.FreightBroker.Domain.Tests/
   ├─ TCG.FreightBroker.Application.Tests/        # DecisionEngine has heavy coverage
   ├─ TCG.FreightBroker.Api.Tests/                # WebApplicationFactory integration
   └─ TCG.FreightBroker.Infrastructure.Tests/     # EF Core migrations + repos
```

---

## Phases & Steps

### Phase 1 — Repo + Tooling Foundation
1. Root workspace files: `.editorconfig`, `.gitignore`, `.gitattributes`, `global.json`, `Directory.Build.props`, `README.md` skeleton, `LICENSE`, `docker-compose.yml` (mssql 2022 with healthcheck + volume), `.env.example`.
2. `.devcontainer/` with .NET 8 SDK, Node 20, pnpm, Docker-in-Docker, and post-create script that runs restore + pnpm install.
3. `pnpm` root workspace for `src/web` and `src/e2e`; root scripts expose `dev`, `dev:api`, `dev:web`, `test`, `test:e2e`, `db:update`, `db:reset`.
4. VS Code `tasks.json` + `launch.json` for every required task (start SQL, api setup, web setup, start api, start web, combined run).
5. Populate `TCG-FreightBroker-Package.sln` with all projects listed above.

### Phase 2 — Domain + Infrastructure Skeleton  *(parallel with Phase 3)*
1. Create all C# projects, wire references, central package versions via `Directory.Packages.props`.
2. Implement Domain entities (see Entities section below) with invariants.
3. `AppDbContext` with Identity integration, EF Core configurations, initial migration, and `Seed` covering: 3 demo users (admin/broker/viewer), sample clients, ~12 lanes (contract+spot), default parameters, weekly booking snapshot.
4. Serilog with correlation-ID enricher and safe-log scrubber (prevents CWE-117 log injection: strip CRLF + structured fields only, never `$"{userInput}"` into messages).

### Phase 3 — Decision Engine (core business asset)  *(parallel with Phase 2)*
1. Port prototype rules into `DecisionEngine` as a pure, deterministic service with explicit `DecisionContext` input (load + lane + weekly state + parameters + client overrides).
2. Rules: contract-GP floor (global + per-client), margin thresholds (contract-need / normal-contract / spot), contract-obligation overrides, client auto-accept suppression, urgency escalation near week end.
3. Output: ordered `RuleResult[]`, weighted score, recommendation (AUTO-ACCEPT / CONTRACT-BOOK / REVIEW / AUTO-REJECT), GP-block flag, pass/fail summary.
4. Exhaustive xUnit tests including property-style tests for monotonicity (raising GP target never increases acceptance rate) and golden-file regression against representative loads.

### Phase 4 — Auth + Users + RBAC
1. ASP.NET Core Identity with `AppUser` (extends IdentityUser; adds PinHash, DisplayName, IsActive, LastLoginUtc).
2. `AuthController`: `POST /api/auth/login` (password), `POST /api/auth/login/pin`, `POST /api/auth/refresh`, `POST /api/auth/logout`. Refresh token in `HttpOnly; Secure; SameSite=Strict` cookie. Access token returned in body for Authorization header.
3. Role policies: `Admin`, `Broker`, `Viewer`. Attribute-based authorization on controllers.
4. Rate limiting: `AspNetCoreRateLimit` or built-in `RateLimiter` — strict bucket on `/auth/*` (5/min/IP), generous default on others.
5. Frontend `AuthProvider` with automatic refresh, role-gated routes, login screen supporting both password and PIN flows.

### Phase 5 — Core CRUD + List APIs
1. Controllers for Users, Clients, Lanes, Parameters, Loads, Audit with consistent envelope: `ApiResult<T>` (`success`, `data`, `error { code, message, details }`, `correlationId`).
2. Pagination/filtering contract: `?page=1&pageSize=50&sort=field:dir&filter[x]=…` with validated bounds. List responses return `Paged<T>` (`items`, `total`, `page`, `pageSize`).
3. FluentValidation on every DTO; validation filter returns 400 with standardized errors.
4. Repository pattern for aggregates that need custom queries (Loads, Audit); direct `DbContext` for simple ones.
5. Audit filter: on state-changing endpoints, record actor, action, load id, GP $ and %.

### Phase 6 — Loads Pipeline + Auto-Booking Hosted Service
1. `LoadGenerator` service: weighted lane selection favoring unmet contract obligations, client code attachment, randomized cost/rate within lane profile.
2. `AutoBookingHostedService` (`BackgroundService`): ticks at configurable interval when enabled, generates load, runs DecisionEngine, applies auto-accept/auto-reject/leave-in-review rules, persists results, publishes SignalR events.
3. Admin endpoints: `GET/POST /api/autobooking/state` (enable/disable, tick interval), role-guarded.
4. `LoadsHub` SignalR hub groups per tenant/role; clients subscribe to `loads:new`, `loads:updated`, `autobooking:state`.

### Phase 7 — Decisions Queue + Confirmation Workflow
1. `DecisionsController`: list pending/accepted/rejected with sort/filter, manual accept/reject, bulk action endpoint.
2. Confirmation safety: server issues short-lived signed confirmation token on "prepare" call; commit call requires matching token. Frontend handles 20-second countdown UX.
3. Bulk action: AI-assisted selection helpers server-side (`selectAiAccepts`, `selectAiRejects`) returning candidate ids for user review — commit step uses explicit id list.
4. Daily drilldown endpoint for accepted-load day view.

### Phase 8 — Contract Tracker, Lane Drilldown, DAT Reference
1. `ContractTrackerService` computes weekly fill %, pace, risk flags, KPI cards from persisted weekly state + accepted load counts.
2. `LaneAnalyticsService`: per-lane KPIs, carrier perf, GP distribution, recent loads, session totals.
3. DAT Rates reference endpoint returning joined lane+client+historical view.

### Phase 9 — Parameter Tuning, Manual Tester, Simulation, Step-Through
1. Parameters endpoints with per-user admin guard; reset-to-default action.
2. `ManualTesterController`: evaluate a hypothetical load against current parameters, returns rule trace.
3. `SimulationController`: run batched synthetic loads server-side (bounded size, e.g., ≤ 10k), return aggregated distribution + by-client + by-lane + GP totals. Runs off-thread with cancellation.
4. `StepThroughController`: session-scoped state capturing AI vs user choices, agreement %.

### Phase 10 — Integrations + Config Export/Import
1. Provider interfaces: `IDatRatesProvider`, `IE2openProvider`, `IEmailIngestionProvider` with real + stub implementations (stub marked and configured via `IntegrationsOptions`).
2. Admin endpoints to get/set integration settings; secrets stored in user-secrets / env vars, surfaced as `isConfigured` booleans only (never returned to client).
3. Export returns JSON blob of clients, parameters, users (no PIN/password hashes), integration metadata (no secrets), e2open URL. Import validates schema and merges atomically inside a transaction.

### Phase 11 — Frontend Feature Build-Out
1. Scaffold Vite app, Tailwind, shadcn, router, axios client, TanStack Query, Zustand, SignalR client.
2. Generate TS types from API via `NSwag` or `openapi-typescript` build step.
3. Build each feature in the structure above, matching prototype UX (header fill score, auto toggle, bulk select + batch confirm bar, rule-trace in load detail, KPI cards, lane drilldown tabs).
4. Role-based UI gating using `useAuth().hasRole()` guards.
5. Accessibility pass on interactive components (keyboard nav for queue, focus traps on modals).

### Phase 12 — Observability, Security Hardening, Docs
1. Correlation-ID middleware; Serilog structured logs to console (JSON) with sink extension point.
2. Health checks: `/health/live`, `/health/ready` (DB + migrations + hosted service state).
3. Global exception middleware returning sanitized `ApiResult` errors with correlation id.
4. Security headers middleware (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy`, HSTS in prod).
5. CORS locked to configured origins.
6. README: stack diagram, local setup, Codespaces setup, migration workflow, run/test commands, troubleshooting. `docs/user-guide.md` for key flows.

### Phase 13 — Testing + CI
1. Backend: xUnit + FluentAssertions + `WebApplicationFactory` + Testcontainers MSSQL for integration; Domain tests pure.
2. Frontend: Vitest + React Testing Library for components and one integration flow (decisions queue bulk accept).
3. E2E: Playwright smoke — login (both modes) → navigate dashboard → create client → run a load decision.
4. GitHub Actions `ci.yml`: matrix for backend (`dotnet test`) + frontend (`pnpm test`) + Playwright against built artifacts; runs on PR; uploads test reports.
5. CodeQL workflow for C# + JS/TS.

---

## Domain Entities (initial)

`User` (Identity-backed), `Role`, `Client`, `Lane`, `LaneClientAssignment`, `Load`, `LoadStatus` enum, `LoadSource` enum, `Recommendation` enum, `WeeklyBookingState`, `Parameters` (singleton + per-client overrides), `AuditEntry`, `IntegrationSetting`, `StepThroughSession`, `SimulationRun`, `FiscalWeek` (value object).

Key indexes: `Load(CreatedUtc desc)`, `Load(LaneId, CreatedUtc)`, `Load(Status)`, `AuditEntry(TimestampUtc desc)`, `AuditEntry(UserId, TimestampUtc)`, unique `Lane.Code`, unique `Client.Code`, unique `LaneClientAssignment.LaneId`.

---

## Cross-Cutting Security Checklist
- EF Core / LINQ only; no string-concatenated SQL. Any `FromSqlRaw` uses parameters.
- All DTOs validated via FluentValidation before service code runs.
- Log enricher strips `\r\n` and control chars from any string property derived from user input (CWE-117).
- Passwords via ASP.NET Identity PBKDF2; PINs via separate `IPinHasher` (PBKDF2 w/ per-user salt) with attempt lockout.
- CSRF: not needed for pure bearer flow; refresh cookie is `SameSite=Strict` + double-submit token on `/auth/refresh` as defense-in-depth.
- Secrets only via env vars / user-secrets; `.env.example` documents shape with placeholder values.
- Rate limiting on auth + expensive endpoints (simulation).
- Audit writes are append-only (no update/delete API) and recorded inside the same transaction as the action.

---

## Relevant Files (key touch points)
- `TCG-FreightBroker-functionality.md` — source of truth for feature parity.
- `tcg-freight-broker.html` and `tcg-freight-broker (37).html` — reference UI + decision rule behavior to port into `DecisionEngine` and React features.
- `TCG-FreightBroker-Package.sln` — populate with new projects.
- `TCG-FreightBroker-Architecture.docx` — read during Phase 2 to capture any architecture constraints not covered by the markdown doc.

---

## Verification Checklist
1. `docker compose up -d sql` starts SQL Server; healthcheck passes.
2. `dotnet ef database update` applies migrations; seed runs once.
3. `dotnet run --project src/api/TCG.FreightBroker.Api` boots; `/health/ready` returns 200; Swagger UI renders.
4. `pnpm --filter web dev` serves at `http://localhost:5173`; login with seeded admin (password and PIN paths both work).
5. Toggle auto-booking from admin UI → new loads stream into the load board over SignalR within seconds.
6. Bulk accept in decisions queue requires batch confirmation; audit entries appear in audit feed live.
7. Run a 1,000-load batch simulation; results render in under 5s; GP totals match sum of per-lane breakdown.
8. Export config → wipe DB → import config → clients/parameters restored (users restored without PINs; re-enrollment required).
9. `dotnet test` and `pnpm test` both green; Playwright smoke green.
10. CI workflow green on a PR; CodeQL clean for critical findings.
11. OWASP spot checks: attempt SQLi in filter params (rejected), attempt log-injection with CRLF in username field (logs remain single-line + structured), unauthenticated access to admin endpoints returns 401/403.

---

## Risks / Assumptions / Follow-ups
- **Backtest feature** was incomplete in prototype; v1 will include a backtest endpoint stub + UI placeholder and flag it as "preview" rather than omit.
- **DAT / e2open / IMAP** are stubbed with real provider interfaces; credentials + production endpoints require the operator to supply them.
- **Tenancy**: assumed single-tenant; multi-tenant partitioning is a follow-up (schema leaves room via optional `TenantId`).
- **Historical data**: no migration path from prototype's in-memory state; seed provides demo data only.
- **Decision engine parity**: exact numeric rule weights/thresholds will be extracted from the HTML JS during Phase 3; any ambiguities will be resolved by inspecting both HTML files and flagged for user confirmation if they disagree.
- **SemVer plan**: `0.1.0` after Phase 5 (read-only parity), `0.2.0` after Phase 7 (decisions operational), `0.3.0` after Phase 10 (admin tooling complete), `1.0.0` when Phase 13 passes CI with E2E green. Subsequent changes: MINOR for additive features, PATCH for fixes, MAJOR reserved for breaking API changes post-1.0.
