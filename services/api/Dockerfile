FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY . .

EXPOSE 3066

CMD ["node", "src/index.js"]
