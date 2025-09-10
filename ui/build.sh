#!/bin/bash
set -e

# Ensure all required files exist
if [ ! -f "tsconfig.json" ]; then
  echo "Error: tsconfig.json not found!"
  exit 1
fi

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps

# Build the app
npm run build

# Copy built files to nginx directory
cp -r build/* /usr/share/nginx/html/

# Start nginx
exec nginx -g 'daemon off;'
