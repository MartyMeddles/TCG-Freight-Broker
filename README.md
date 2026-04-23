# TCG Freight Broker

Internal freight-brokerage decision platform built on ASP.NET 10 + React + SQL Server.

## Quick Start

### Prerequisites
- .NET 10 SDK
- Node.js 20+ / pnpm 9+
- SQL Server (local instance `MTV-C39S774\SQLEXPRESS` or any SQL Server)

### Run locally

```powershell
# 1. Apply migrations (creates the TcgFreightBroker database on SQLEXPRESS)
dotnet ef database update -p src\api\TCG.FreightBroker.Infrastructure -s src\api\TCG.FreightBroker.Api

# 2. Start the API
dotnet run --project src\api\TCG.FreightBroker.Api

# 3. Start the frontend (new terminal)
cd src\web
pnpm install
pnpm dev
```

- API docs: `http://localhost:5239/scalar/v1`
- Health check: `http://localhost:5239/health`
- Frontend: `http://localhost:5173`

## Project Structure

```
src/
  api/                    # .NET 10 back-end (Clean Architecture)
    TCG.FreightBroker.Api/           # Host: controllers, middleware, hubs
    TCG.FreightBroker.Application/   # Business logic, decision engine
    TCG.FreightBroker.Domain/        # Entities
    TCG.FreightBroker.Infrastructure/ # EF Core, auth, integrations, seeding
    TCG.FreightBroker.Contracts/     # DTOs / request-response contracts
  web/                    # React + Vite + Tailwind front-end
  e2e/                    # Playwright end-to-end tests
tests/                    # xUnit unit / integration tests
Docs/                     # Additional documentation
```

## Build & Test

```powershell
dotnet build
dotnet test
pnpm -r test
```

## Observability

- Structured logs are written to `logs/tcg-freight-broker-<date>.jsonl` (JSON Lines, 30-day rolling).
- Every request is tagged with an `X-Correlation-Id` header (auto-generated if not provided by the caller).
- Health endpoint: `GET /health` — returns SQL Server connectivity status.

## Security Notes

- JWT secrets live in `appsettings.Development.json` (dev only — never commit production secrets).
- CORS origins are configured via `Cors:AllowedOrigins` in appsettings / environment variables.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) applied to all responses.
- Rate limiting: 5 login attempts per IP per minute.

