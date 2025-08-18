FROM ghcr.io/puppeteer/puppeteer:22.10.0

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

USER root
RUN apt-get update && apt-get install -y fonts-noto fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
USER pptruser

COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
