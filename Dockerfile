FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

CMD ["node", "server.js"]
