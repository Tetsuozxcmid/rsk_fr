#!/bin/bash
# Рестарт: systemctl restart nextjs.service
NODE_BIN="/root/.nvm/versions/node/v22.18.0/bin/node"
NPM_BIN="/root/.nvm/versions/node/v22.18.0/bin/npm"


PROJECT_DIR="/root/rsk_fr"
cd "$PROJECT_DIR" || { echo "Проект не найден"; exit 1; }

exec $NPM_BIN run start -- -p 3000