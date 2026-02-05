# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=http://172.168.1.95:3066
ARG VITE_WS_URL=ws://172.168.1.95:3066
ARG VITE_AI_SERVICE_URL=http://172.168.1.95:3067
ARG VITE_MCP_URL=http://172.168.1.95:3067/mcp
ARG VITE_A2A_URL=http://172.168.1.95:3067/a2a

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
ENV VITE_MCP_URL=$VITE_MCP_URL
ENV VITE_A2A_URL=$VITE_A2A_URL

COPY package*.json ./
RUN npm install --ignore-scripts && npm cache clean --force

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3065

CMD ["nginx", "-g", "daemon off;"]
