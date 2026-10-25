FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY server ./server
COPY --from=build /app/dist ./dist
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node","server/index.mjs"]
