#!/usr/bin/env bash
# exit on error
set -o errexit # Esto es importante: detiene el script si un comando falla

# Install dependencies, ignoring peer dependency conflicts
echo "Running npm install --legacy-peer-deps..."
npm install --legacy-peer-deps

# Run the build command after all installations are done
echo "Running Next.js build (npm run build)..."
npm run build # <-- ESTA LÍNEA ES CRUCIAL
