# ===============================
# 1️⃣ Build Stage
# ===============================
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of your app
COPY . .

# Build React app for production
RUN npm run build

# ===============================
# 2️⃣ Production Stage
# ===============================
FROM nginx:stable-alpine

# Copy build output to Nginx's web root
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
