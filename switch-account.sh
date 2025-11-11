#!/bin/bash

# Helper script to switch between Google Cloud accounts
# Usage: ./switch-account.sh [personal|work]

WORK_ACCOUNT="sahern@pineparkhealth.com"
PERSONAL_ACCOUNT="shane@shaneahern.com"

if [ "$1" = "work" ]; then
    echo "Switching to work account: $WORK_ACCOUNT"
    gcloud config set account $WORK_ACCOUNT
    # Unset project since wflbusfinder is a personal project
    gcloud config unset project
    echo "✅ Switched to work account"
    echo "✅ Cleared project (wflbusfinder is personal, not work)"
    echo ""
    echo "Current configuration:"
    gcloud config list
elif [ "$1" = "personal" ]; then
    echo "Switching to personal account: $PERSONAL_ACCOUNT"
    gcloud config set account $PERSONAL_ACCOUNT
    gcloud config set project wflbusfinder
    echo "✅ Switched to personal account and set project to wflbusfinder"
    echo ""
    echo "Current configuration:"
    gcloud config list
else
    echo "Usage: $0 [personal|work]"
    echo ""
    echo "Current account: $(gcloud config get-value account)"
    echo "Current project: $(gcloud config get-value project)"
    echo ""
    echo "Available accounts:"
    gcloud auth list
fi
