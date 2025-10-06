#!/bin/bash
git pull origin main
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && npm run build && cd ..
mkdir -p public && rm -rf public/* && cp -r frontend/dist/* public/
cd backend && pm2 restart attendance-app || pm2 start dist/index.js --name "attendance-app" --env production
echo "✅ Done!"

