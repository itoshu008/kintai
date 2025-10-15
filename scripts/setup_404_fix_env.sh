#!/usr/bin/env bash
# 404修正用環境変数設定

export BUILD_USER=itoshu
export APP_DIR=/home/zatint1991-hvt55/zatint1991.com
export BACKEND_DIR=$APP_DIR/backend
export PUBLIC_DIR=$APP_DIR/public/kintai
export PM2_HOME=/home/$BUILD_USER/.pm2
export PM2_APP=kintai-api
export PORT=8001

echo "404 Fix Environment Variables:"
echo "BUILD_USER=$BUILD_USER"
echo "APP_DIR=$APP_DIR"
echo "BACKEND_DIR=$BACKEND_DIR"
echo "PUBLIC_DIR=$PUBLIC_DIR"
echo "PM2_HOME=$PM2_HOME"
echo "PM2_APP=$PM2_APP"
echo "PORT=$PORT"
