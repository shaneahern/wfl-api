# Pre-Deployment Checklist

Before deploying, verify you're deploying to the correct project:

## Quick Check

```bash
# Check current project
gcloud config get-value project

# Should output: wflbusfinder
```

## If Wrong Project

```bash
# Set correct project
gcloud config set project wflbusfinder

# Verify
gcloud config get-value project
```

## Deployment

The `deploy.sh` script will automatically:
- ✅ Check your current project
- ✅ Switch to `wflbusfinder` if needed
- ✅ Verify before deploying
- ✅ Show warnings if project differs

## After Deployment

Verify deployment went to correct project:
```bash
gcloud functions list --gen2 --project=wflbusfinder
```

You should see `wfl-api` in the list.
