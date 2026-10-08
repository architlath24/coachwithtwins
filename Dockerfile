FROM node:24-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Main FitTwins coaching website
COPY index.html /usr/share/nginx/html/index.html

# Biological Age React application
COPY --from=build /app/dist /usr/share/nginx/html/biological-age

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
