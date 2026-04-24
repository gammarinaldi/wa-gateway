# Implementation Plan - Docker Hot Reloading

Currently, the Docker setup is optimized for production, which requires a full rebuild (`--build`) for every change. To improve the developer experience, we will modify `docker-compose.yml` to support hot reloading.

## Proposed Changes

### 1. Update `docker-compose.yml`
- Add **volumes** to mount the local source code into the container.
- Set `NODE_ENV=development`.
- Override the default container command to run `npm run dev`.
- Add an environment variable `WATCHPACK_POLLING=true` if needed for some Linux/Docker environments to detect file changes correctly.

### 2. Implementation Details

We will update the `dashboard-app` service in `docker-compose.yml`:

```yaml
    volumes:
      - .:/app
      - /app/node_modules # Anonymous volume to prevent local node_modules from overriding container's
      - /app/.next # Anonymous volume for next build cache
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true # Ensures HMR works in Docker
    command: npm run dev
```

## Benefits
- Changes in `src/` or `globals.css` will be detected by `tsx watch` and Next.js HMR.
- No need to run `docker compose up --build` for every UI or logic change.
- Rebuild is only needed when adding new dependencies (`package.json`) or changing `prisma/schema.prisma`.
