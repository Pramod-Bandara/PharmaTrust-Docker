# PharmaTrust Auth Service

Minimal Express + TypeScript authentication microservice for demo.

## Endpoints
- POST `/api/auth/login` { username, password }
- POST `/api/auth/refresh` { refreshToken }
- POST `/api/auth/logout` (Authorization: Bearer <access>) { refreshToken? }
- GET `/api/auth/me` (Authorization: Bearer <access>)
- GET `/api/auth/health`
- GET `/healthz`

## Env
See `.env.example`.

## Dev
```bash
npm install
npm run dev
```

## Build
```bash
npm run build && npm start
```
