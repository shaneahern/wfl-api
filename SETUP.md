# Setup Instructions

## Initial GitHub Repository Setup

1. **Create the repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `wfl-api`
   - Description: "WFL Bus Finder API - Python FastAPI on Cloud Functions"
   - Choose Public or Private
   - **Do NOT** initialize with README, .gitignore, or license (we already have these)

2. **Push to GitHub:**
   ```bash
   cd /Users/shane/Documents/GitHub/wfl-api
   git add .
   git commit -m "Initial commit: Python FastAPI Cloud Functions app"
   git remote add origin https://github.com/shaneahern/wfl-api.git
   git push -u origin main
   ```

3. **Verify:**
   - Visit https://github.com/shaneahern/wfl-api
   - Confirm all files are present

## Future Updates

After making changes:
```bash
cd /Users/shane/Documents/GitHub/wfl-api
git add .
git commit -m "Your commit message"
git push
```
