# Quick Fix: 403 Error - Origin Not Allowed

## The Problem
You're seeing: `The given origin is not allowed for the given client ID`

This means your frontend URL is not added to Google Cloud Console's authorized origins.

## Step-by-Step Fix

### 1. Find Your Exact Origin

Open your browser's Developer Console (F12) and look at the error. It will show the exact origin being blocked, for example:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`

**Or check your browser's address bar** - that's the exact URL you need to add.

### 2. Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID** (the one you're using)
5. Scroll down to **Authorized JavaScript origins**
6. Click **+ ADD URI**
7. Add the **exact** URL from step 1, for example:
   - `http://localhost:5173` (if that's what you see in the address bar)
   - `http://127.0.0.1:5173` (if that's what you see)
   - Include the protocol (`http://` or `https://`)
   - Include the port number if present
   - **NO trailing slash** (don't add `/` at the end)
8. Click **Save**

### 3. Common URLs to Add

Add ALL of these to be safe:
- `http://localhost:5173` (Vite default)
- `http://127.0.0.1:5173` (alternative localhost)
- `http://localhost:3000` (if using React default)
- `http://localhost` (if using port 80)

### 4. Wait and Refresh

- Wait **1-2 minutes** for changes to propagate
- **Hard refresh** your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Try Google Sign-In again

### 5. Still Not Working?

1. **Check the exact error** in browser console - it will tell you the exact origin
2. **Verify your Client ID** matches in:
   - Frontend `.env` file: `VITE_GOOGLE_CLIENT_ID`
   - Google Cloud Console
3. **Make sure there are no typos** in the URL
4. **Check if you're using `http://` vs `https://`** - must match exactly
5. **Try clearing browser cache** and cookies

## Example

If your browser shows `http://localhost:5173` in the address bar:
- Add exactly: `http://localhost:5173` (no trailing slash)
- NOT: `http://localhost:5173/`
- NOT: `localhost:5173`
- NOT: `https://localhost:5173`

## Quick Checklist

- [ ] Found exact origin from browser address bar or console error
- [ ] Added exact URL to Google Cloud Console (with http:// and port)
- [ ] Clicked Save in Google Cloud Console
- [ ] Waited 1-2 minutes
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Tried Google Sign-In again

