FROM node:20-alpine

# Prisma precisa do openssl no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate

CMD ["npm", "run", "start:dev"]