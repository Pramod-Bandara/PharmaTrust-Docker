# Dockerfile for PharmaTrust Mobile Expo Dev Server
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache python3 make g++ wget

# Install Expo CLI and serve globally
RUN npm install -g expo-cli serve

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose Expo web port
EXPOSE 19006 8081

# Set environment variables
ENV NODE_ENV=development
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_USE_FAST_RESOLVER=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081 || exit 1

# Start Expo dev server with metro bundler for web
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
