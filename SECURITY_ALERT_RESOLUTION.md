# Security Alert Resolution Guide

## Issue
A Google Maps API key was exposed in the public GitHub repository at:
- File: `frontend/src/pages/BusFinder.tsx`
- Key: `AIzaSyA_hsPlpwVhYZBBSkKqSrCpT0UlapoCT3E`
- Project: `wflbusfinder`

## Actions Taken

### ✅ 1. Removed Hardcoded API Key
- Removed the hardcoded API key from `BusFinder.tsx`
- Changed to use environment variable only: `VITE_GOOGLE_MAPS_API_KEY`
- Added warning comment about never committing API keys

### ✅ 2. Updated Configuration
- Updated `.gitignore` to ensure `.env.local` files are never committed
- Updated deployment script to check for API key environment variable
- Added documentation for setting up API keys securely

### ✅ 3. Documentation Updates
- Updated `README.md` with API key setup instructions
- Updated `DEPLOYMENT.md` with security best practices
- Added instructions for API key restrictions

## Required Actions

### 🔴 CRITICAL: Regenerate the Compromised API Key

1. **Go to Google Cloud Console**:
   - Navigate to: https://console.cloud.google.com/apis/credentials?project=wflbusfinder
   - Sign in with your personal account (`shane@shaneahern.com`)

2. **Find and Regenerate the Key**:
   - Find the API key: `AIzaSyA_hsPlpwVhYZBBSkKqSrCpT0UlapoCT3E`
   - Click "Edit" (pencil icon)
   - Click "Regenerate Key" button
   - Copy the new API key

3. **Add API Key Restrictions** (IMPORTANT):
   - **Application restrictions**: Select "HTTP referrers (web sites)"
   - Add your production domain(s):
     - `https://us-central1-wflbusfinder.cloudfunctions.net/*`
     - `https://your-production-domain.com/*` (if applicable)
   - **API restrictions**: Select "Restrict key"
   - Check only: "Maps JavaScript API"
   - Click "Save"

4. **Update Your Local Environment**:
   ```bash
   # In frontend directory
   echo "VITE_GOOGLE_MAPS_API_KEY=your_new_api_key_here" > .env.local
   ```

5. **Update Deployment**:
   ```bash
   export VITE_GOOGLE_MAPS_API_KEY=your_new_api_key_here
   ./deploy.sh
   ```

### 🔴 CRITICAL: Remove Key from Git History

The exposed key is still in your git history. To completely remove it:

**Option 1: Use git-filter-repo (Recommended)**
```bash
# Install git-filter-repo if not already installed
pip install git-filter-repo

# Remove the key from all commits
git filter-repo --path frontend/src/pages/BusFinder.tsx --invert-paths
# Then re-add the file with the fixed version
git add frontend/src/pages/BusFinder.tsx
git commit -m "Remove exposed API key"
git push --force
```

**Option 2: Use BFG Repo-Cleaner**
```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**Option 3: Contact GitHub Support**
If you're not comfortable with force-pushing, GitHub Support can help remove sensitive data from repository history.

### ⚠️ Monitor for Abuse

1. **Check API Usage**:
   - Go to: https://console.cloud.google.com/apis/dashboard?project=wflbusfinder
   - Review "Maps JavaScript API" usage
   - Look for unusual spikes or unexpected usage

2. **Set Up Billing Alerts**:
   - Go to: https://console.cloud.google.com/billing?project=wflbusfinder
   - Set up budget alerts to notify you of unexpected charges

3. **Review Logs**:
   - Check Cloud Logging for any abuse notifications
   - Review API key usage patterns

## Prevention

### ✅ Best Practices Going Forward

1. **Never commit API keys**:
   - Always use environment variables
   - Use `.env.local` for local development (already in `.gitignore`)
   - Use Cloud Functions environment variables for production

2. **Use API Key Restrictions**:
   - Always restrict API keys to specific APIs
   - Use HTTP referrer restrictions for web apps
   - Use IP restrictions for server-side APIs

3. **Regular Security Audits**:
   - Use GitHub's secret scanning (already enabled)
   - Regularly review exposed credentials
   - Rotate API keys periodically

4. **Use Secret Management**:
   - For production, consider using Google Secret Manager
   - Never hardcode secrets in source code

## Verification

After completing the above steps:

1. ✅ Verify the key is removed from the codebase:
   ```bash
   grep -r "AIzaSyA_hsPlpwVhYZBBSkKqSrCpT0UlapoCT3E" .
   # Should return no results
   ```

2. ✅ Verify the new key works:
   - Test locally with `.env.local`
   - Test in production after deployment

3. ✅ Verify API restrictions are in place:
   - Check in Google Cloud Console
   - Test that unauthorized domains cannot use the key

## Support

If you need help:
- Google Cloud Support: https://cloud.google.com/support
- GitHub Support: https://support.github.com
- Security best practices: https://cloud.google.com/docs/security
