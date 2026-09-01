FROM node:22-alpine AS build

WORKDIR /web

ARG VITE_APP_NAME="Provider Portal"
ARG VITE_APP_TAGLINE="One relationship. One connected place."
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_TAGLINE=${VITE_APP_TAGLINE}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ >/dev/null || exit 1
