#!/bin/bash
# 前提（変数）の設定

export BUILD_USER=itoshu
export APP_DIR=/home/zatint1991-hvt55/zatint1991.com
export BACKEND_DIR=$APP_DIR/backend
export PM2_HOME=/home/$BUILD_USER/.pm2
export PM2_APP=kintai-api
export PORT=8001

echo "Environment variables set:"
echo "BUILD_USER=$BUILD_USER"
echo "APP_DIR=$APP_DIR"
echo "BACKEND_DIR=$BACKEND_DIR"
echo "PM2_HOME=$PM2_HOME"
echo "PM2_APP=$PM2_APP"
echo "PORT=$PORT"
