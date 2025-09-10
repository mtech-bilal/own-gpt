# Build stage
FROM node:18-slim as build

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install Python and build dependencies
RUN apt-get update && apt-get install -y python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with legacy peer deps and clean cache
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --no-optional && \
    npm install -g typescript && \
    npm install --save-dev typescript @types/node @types/react @types/react-dom @types/jest

# Copy source files
COPY . .

# Set environment variables
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Set environment variables
ENV NODE_ENV=production

# Set proper permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port 80
EXPOSE 80

# Start the application using the build script
CMD ["/usr/local/bin/build.sh"]
