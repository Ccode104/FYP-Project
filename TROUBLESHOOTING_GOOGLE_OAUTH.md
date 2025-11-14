# Troubleshooting Google OAuth Issues

## Error: "The given origin is not allowed for the given client ID" (403)

This error means your frontend URL is not added to Google Cloud Console's authorized JavaScript origins.

### Solution:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, add:
   - The exact URL you're using (check browser address bar)
   - Common ones to add:
     - `http://localhost:5173` (Vite default)
     - `http://localhost:3000` (React default)
     - `http://127.0.0.1:5173` (alternative format)
     - `http://localhost` (if using port 80)
5. Click **Save**
6. Wait 1-2 minutes for changes to propagate
7. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
8. Try again

### How to find your exact origin:

1. Open browser console (F12)
2. Look at the error message - it will show the origin being blocked
3. Copy that exact URL and add it to Google Cloud Console

## Error: "Internal server error" (500) from backend

This could be several issues:

### 1. Check Backend Server Logs

Look at your backend terminal/console for detailed error messages. Common issues:

#### Database Connection Error
- Make sure your database is running
- Check `DATABASE_URL` in backend `.env` file
- Verify database connection in `backend/db/index.js`

#### Missing Axios
If you see "axios is not defined":
```bash
cd backend
npm install axios
```

#### Token Verification Failing
- Check that the Google token is being received correctly
- Verify `GOOGLE_CLIENT_ID` in backend `.env` matches your frontend Client ID
- Check backend logs for specific error messages

### 2. Enable Detailed Error Messages

The backend should show detailed errors in development mode. Check:
- Backend terminal output
- Browser Network tab → Response tab for the `/api/auth/google` request

### 3. Common Fixes

```bash
# Restart backend server
cd backend
npm start

# Check if axios is installed
npm list axios

# Verify environment variables
# Check backend/.env has:
# - DATABASE_URL
# - JWT_SECRET
# - GOOGLE_CLIENT_ID (optional but recommended)
```

## Error: Cross-Origin-Opener-Policy

This is usually a warning and can be ignored for local development. If it's blocking functionality:

1. Check your backend CORS settings
2. Make sure backend allows requests from your frontend origin
3. Check `backend/server.js` or `backend/index.js` for CORS configuration

## Quick Checklist

- [ ] Frontend `.env` has `VITE_GOOGLE_CLIENT_ID` set
- [ ] Backend `.env` has `GOOGLE_CLIENT_ID` set (optional but recommended)
- [ ] Google Cloud Console has your frontend URL in authorized JavaScript origins
- [ ] Backend server is running
- [ ] Database is connected
- [ ] Axios is installed in backend (`npm list axios`)
- [ ] Restarted frontend dev server after adding `.env` file
- [ ] Hard refreshed browser (Ctrl+Shift+R)

## Still Having Issues?

1. Check browser console for specific error messages
2. Check backend terminal for server-side errors
3. Verify your Google Client ID is correct in both frontend `.env` and Google Cloud Console
4. Make sure you're using the same Client ID in both places
5. Wait a few minutes after making changes in Google Cloud Console (changes can take time to propagate)

