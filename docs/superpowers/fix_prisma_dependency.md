# Implementation Plan - Fix Prisma Dependency

The error `sh: 1: prisma: not found` occurs because the `postinstall` script in `@gammarinaldi/wa-gateway` requires the Prisma CLI, but `prisma` is currently listed as a `devDependency`. When a consumer installs the package, `devDependencies` are not included, causing the `prisma generate` command to fail.

## Proposed Changes

### 1. Update `package.json` in `wa-gateway`
- Move `prisma` from `devDependencies` to `dependencies`.
- This ensures that the Prisma CLI is available when the package is installed by consumers.

### 2. Update `postinstall` script
- Use `npx prisma generate` to be more robust.

## Consumer Project (`trader-assist`)
- If you want a quick fix without updating the package, your proposed steps are correct:
    1. `npm init -y` (if needed)
    2. `npm install -D prisma`
    3. `npm i @gammarinaldi/wa-gateway`
