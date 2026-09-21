FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN npm install

COPY . .

RUN npm run db:generate --workspace=@princess-brothers/db

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=@princess-brothers/web"]
