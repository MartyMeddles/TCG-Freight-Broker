FROM mcr.microsoft.com/devcontainers/dotnet:1-8.0

# Node.js (for pnpm / Vite)
ARG NODE_VERSION=20
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# dotnet-ef global tool
RUN dotnet tool install --global dotnet-ef \
    && echo 'export PATH="$PATH:/root/.dotnet/tools"' >> /root/.bashrc

# Docker CLI (for docker compose inside container)
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*
