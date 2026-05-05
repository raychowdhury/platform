# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /repo

# install pnpm
RUN corepack enable

# workspace files first to prime the lockfile cache
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile --filter @platform/web...

COPY apps/web ./apps/web
RUN pnpm --filter @platform/web build

FROM nginx:1.27-alpine
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
