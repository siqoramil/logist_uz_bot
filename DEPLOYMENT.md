# Production deployment

## Server

Install Docker Engine, Docker Compose v2 and Git. Clone the repository, then create the production environment file:

```bash
cp telegram-bot/.env.production.example telegram-bot/.env.production
chmod 600 telegram-bot/.env.production
```

Fill every secret and set `ADMIN_ORIGIN` to the public HTTPS admin URL. Passwords embedded in MongoDB/Redis URLs must be URL-safe.

Put Nginx, Caddy or Cloudflare Tunnel in front of `127.0.0.1:8080` and enable HTTPS. MongoDB and Redis are not exposed publicly.

## GitHub production secrets

- `DEPLOY_HOST`
- `DEPLOY_PORT` (usually `22`)
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH` (absolute cloned repository path)
- `GHCR_USERNAME`
- `GHCR_TOKEN` with `read:packages`

Protect the GitHub `production` environment with required reviewers if manual approval is desired. A push to `main` builds immutable bot/admin images and deploys the exact commit SHA.

## First start and operations

```bash
cd telegram-bot
docker compose --env-file .env.production -f docker-compose.yml up -d
docker compose --env-file .env.production -f docker-compose.yml ps
docker compose --env-file .env.production -f docker-compose.yml logs -f bot
```

Back up the `mongo_data` volume regularly. The admin login is seeded from `.env.production` only on the first start; later changes made in Admin Profile are stored in MongoDB.
