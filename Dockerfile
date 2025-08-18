# Chromium + bağımlılıkları hazır gelen base image
FROM ghcr.io/puppeteer/puppeteer:22.10.0

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Türkçe karakterler için geniş font seti önerilir
RUN apt-get update && apt-get install -y fonts-noto fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
