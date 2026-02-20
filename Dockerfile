# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app

#docker run --rm --name exitus-inst-container -p 4200:8080 exitus-inst

# Copy only the manifest files for caching
COPY package.json package-lock.json ./

# Install dependencies (cached)
RUN npm install --prefer-offline

# Copy the rest of the project
COPY . .

# Build Angular app
RUN npm run build --production

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output
COPY --from=build /app/dist/demo/browser /usr/share/nginx/html

# Custom nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
