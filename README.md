# TCG Freight Broker

Internal freight-brokerage decision platform built on ASP.NET 8 + React + SQL Server.

## Quick Start

### Prerequisites
- .NET 10 SDK
- Node.js 20+ / pnpm 9+
- SQL Server (local instance `MTV-C39S774\SQLEXPRESS` or any SQL Server)

### Run locally

```powershell
# 1. Apply migrations (creates the TcgFreightBroker database on SQLEXPRESS)
dotnet ef database update -p src\api\TCG.FreightBroker.Infrastructure -s src\api\TCG.FreightBroker.Api

# 3. Start the API
dotnet run --project src\api\TCG.FreightBroker.Api

# 4. Start the frontend (new terminal)
cd src\web
pnpm install
pnpm dev
```

API docs available at `https://localhost:5001/swagger`.

## Project Structure

```
src/
  api/                    # .NET 8 back-end (Clean Architecture)
    TCG.FreightBroker.Api/
    TCG.FreightBroker.Application/
    TCG.FreightBroker.Domain/
    TCG.FreightBroker.Infrastructure/
    TCG.FreightBroker.Contracts/
  web/                    # React + Vite + Tailwind front-end
  e2e/                    # Playwright end-to-end tests
tests/                    # xUnit unit / integration tests
docs/                     # Additional documentation
```

## Build & Test

```powershell
dotnet build
dotnet test
pnpm -r test
```
