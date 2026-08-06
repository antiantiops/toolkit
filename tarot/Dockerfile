FROM node:22-alpine
WORKDIR /app
COPY server.js .
COPY index.html style.css app.js public/
COPY assets/ public/assets/
EXPOSE 80
CMD ["node", "server.js"]
