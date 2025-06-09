#!/usr/bin/env bash
# exit on error
set -o errexit # Esto es importante: detiene el script si un comando falla

# Install dependencies, ignoring peer dependency conflicts
echo "Running npm install --legacy-peer-deps..."
npm install --legacy-peer-deps

# Ensure the Puppeteer cache directory exists
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

# Install Puppeteer and download Chrome
echo "Installing Puppeteer browser..."
npx puppeteer browsers install chrome

# Run the build command after all installations are done
echo "Running Next.js build (npm run build)..."
npm run build # <-- ESTA LÍNEA ES CRUCIAL