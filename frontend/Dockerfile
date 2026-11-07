FROM node:20-alpine AS b
WORKDIR /s
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=b /s/dist /usr/share/nginx/html
