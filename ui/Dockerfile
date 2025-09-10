# Build stage
FROM node:18-slim as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy build script and make it executable
COPY build.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/build.sh

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
