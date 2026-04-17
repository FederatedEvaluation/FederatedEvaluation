#!/bin/bash
cd "$(dirname "$0")"
mkdir -p logs
echo "Starting frontend + fairness backend + D3EM backend (logs in logs/dev.log)..."
npm run dev | tee logs/dev.log
