Below is a practical, copy-paste sequence to execute the plan. Run each block from the repo root in PowerShell unless noted. I'll do each step for you on request — just say "do step N".

## 0. One-time prerequisites (install if missing)
```powershell
winget install Microsoft.DotNet.SDK.8
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install Git.Git
npm install -g pnpm
```
Then restart the terminal and verify:
```powershell
dotnet --version; node -v; pnpm -v; docker --version
```

## 1. Phase 1 — Repo + tooling foundation
Create root config files and devcontainer.
```powershell
# from repo root
cd "C:\Users\MartyMeddles\OneDrive - Warehouse Services, Inc\Projects\CTL\TCG-FreightBroker-Package"
New-Item -ItemType Directory -Force .devcontainer, .github\workflows, docs, scripts, src\api, src\web, src\e2e, tests | Out-Null
```
Files to create (I can generate each): `.editorconfig`, `.gitignore`, `.gitattributes`, `global.json` (pin .NET 8), `Directory.Build.props`, `Directory.Packages.props`, `docker-compose.yml` (mssql 2022 + healthcheck), `.env.example`, `pnpm-workspace.yaml`, root `package.json`, `.devcontainer/devcontainer.json` + `Dockerfile`, `README.md` skeleton, `.vscode/tasks.json` + `launch.json`.

Start SQL Server:
```powershell
docker compose up -d sql
```

## 2. Phase 2 — Create .NET projects + wire solution
```powershell
cd src\api
dotnet new webapi    -n TCG.FreightBroker.Api        -o TCG.FreightBroker.Api --use-controllers
dotnet new classlib  -n TCG.FreightBroker.Application -o TCG.FreightBroker.Application
dotnet new classlib  -n TCG.FreightBroker.Domain      -o TCG.FreightBroker.Domain
dotnet new classlib  -n TCG.FreightBroker.Infrastructure -o TCG.FreightBroker.Infrastructure
dotnet new classlib  -n TCG.FreightBroker.Contracts   -o TCG.FreightBroker.Contracts
cd ..\..\tests
dotnet new xunit -n TCG.FreightBroker.Domain.Tests
dotnet new xunit -n TCG.FreightBroker.Application.Tests
dotnet new xunit -n TCG.FreightBroker.Api.Tests
dotnet new xunit -n TCG.FreightBroker.Infrastructure.Tests
cd ..

# add everything to the existing solution
dotnet sln TCG-FreightBroker-Package.sln add (Get-ChildItem -r -Filter *.csproj).FullName

# project references
dotnet add src\api\TCG.FreightBroker.Api\TCG.FreightBroker.Api.csproj reference src\api\TCG.FreightBroker.Application\TCG.FreightBroker.Application.csproj src\api\TCG.FreightBroker.Infrastructure\TCG.FreightBroker.Infrastructure.csproj src\api\TCG.FreightBroker.Contracts\TCG.FreightBroker.Contracts.csproj
dotnet add src\api\TCG.FreightBroker.Application\TCG.FreightBroker.Application.csproj reference src\api\TCG.FreightBroker.Domain\TCG.FreightBroker.Domain.csproj src\api\TCG.FreightBroker.Contracts\TCG.FreightBroker.Contracts.csproj
dotnet add src\api\TCG.FreightBroker.Infrastructure\TCG.FreightBroker.Infrastructure.csproj reference src\api\TCG.FreightBroker.Domain\TCG.FreightBroker.Domain.csproj src\api\TCG.FreightBroker.Application\TCG.FreightBroker.Application.csproj
```
Then I'll add EF Core, Identity, Serilog, FluentValidation, SignalR, JWT packages via `Directory.Packages.props` and generate Domain entities + `AppDbContext` + initial migration + seed.

```powershell
dotnet tool install --global dotnet-ef
dotnet ef migrations add Initial -p src\api\TCG.FreightBroker.Infrastructure -s src\api\TCG.FreightBroker.Api
dotnet ef database update       -p src\api\TCG.FreightBroker.Infrastructure -s src\api\TCG.FreightBroker.Api
```

## 3. Phase 3 — Decision Engine (pure library + xUnit tests)
I'll port the rules from tcg-freight-broker.html into `TCG.FreightBroker.Application/DecisionEngine/` with golden-file tests in `TCG.FreightBroker.Application.Tests`.
```powershell
dotnet test
```

## 4. Phase 4 — Auth + Users + RBAC
Implement Identity, JWT, PIN hasher, rate limiting, `AuthController`, role policies. Verify:
```powershell
dotnet run --project src\api\TCG.FreightBroker.Api
# hit https://localhost:5001/swagger
```

## 5. Phase 5 — Core CRUD endpoints
Users / Clients / Lanes / Parameters / Loads / Audit + `ApiResult<T>` envelope + pagination + FluentValidation + audit filter.

## 6. Phase 6 — Loads pipeline + auto-booking hosted service
`LoadGenerator`, `AutoBookingHostedService`, `LoadsHub` SignalR hub, admin toggle endpoint.

## 7. Phase 7 — Decisions queue + confirmation token workflow
Manual/bulk accept-reject, prepare/commit pattern, daily drilldown.

## 8. Phase 8 — Contract tracker, lane drilldown, DAT reference views

## 9. Phase 9 — Parameters, manual tester, simulation, step-through

## 10. Phase 10 — Integrations + config export/import (DAT/e2open/IMAP stubs)

## 11. Phase 11 — Frontend build-out
```powershell
cd src\web
pnpm create vite . --template react-ts
pnpm add axios @tanstack/react-query zustand react-router-dom @microsoft/signalr
pnpm add -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom openapi-typescript
pnpm dlx tailwindcss init -p
# shadcn/ui
pnpm dlx shadcn@latest init
cd ..\..
```
Then I'll scaffold router, auth provider, SignalR hooks, and build each feature module in the folder structure.

## 12. Phase 12 — Observability + security hardening + docs
Correlation-id middleware, Serilog JSON, health checks, security headers, CORS lock, README + `docs/*.md`.

## 13. Phase 13 — Tests + CI
```powershell
cd src\e2e; pnpm init -y; pnpm add -D @playwright/test; pnpm dlx playwright install; cd ..\..
dotnet test
pnpm -r test
pnpm --filter e2e exec playwright test
```
Add `.github/workflows/ci.yml` (backend + frontend + Playwright) and `codeql.yml`.

---

## How to drive this
Tell me **"do step 1"** (or any step number) and I'll generate the exact files and run the commands. Recommended order: 1 → 2 → 3, then 4–13 in sequence. Steps 2 and 3 can run in parallel if you want two sessions.

Want me to start with **step 1** now?