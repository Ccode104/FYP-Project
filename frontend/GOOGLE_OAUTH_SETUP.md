# Google OAuth Setup Guide

This application supports Google Sign-In for authentication. Follow these steps to enable it:

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with the Google Identity Services API enabled

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Identity Services API

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace account)
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
4. Add scopes (at minimum, you'll need `email` and `profile`)
5. Add test users (if in testing mode)

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application** as the application type
4. Add authorized JavaScript origins (IMPORTANT - Add ALL of these):
   - `http://localhost:5173` (Vite default port)
   - `http://localhost:3000` (if using React default)
   - `http://127.0.0.1:5173` (alternative localhost format)
   - `http://localhost` (if using port 80)
   - Your production domain (e.g., `https://yourdomain.com`)
   
   **Note:** Make sure to include the exact URL you're using. If you see a 403 error, check the browser console to see what origin is being blocked and add it here.

5. Add authorized redirect URIs:
   - `http://localhost:5173` (for local development)
   - `http://localhost:3000` (if using React default)
   - Your production domain
   
   **Note:** For Google Sign-In button (not popup), redirect URIs may not be strictly required, but it's good to add them.
6. Click **Create**
7. Copy the **Client ID** (you'll need this for the frontend)

### 4. Configure Frontend

1. Create a `.env` file in the `frontend` directory (if it doesn't exist)
2. Add your Google Client ID:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

3. Restart your development server for the changes to take effect

### 5. Backend Configuration

The backend needs to handle the Google OAuth token. Ensure your backend has:

1. An endpoint at `/api/auth/google` that accepts POST requests with:
   ```json
   {
     "credential": "google-jwt-token-here"
   }
   ```

2. The backend should:
   - Verify the Google JWT token
   - Extract user information (email, name, etc.)
   - Create or find the user in your database
   - Return a JWT token and user object:
     ```json
     {
       "token": "your-app-jwt-token",
       "user": {
         "id": 123,
         "name": "User Name",
         "email": "user@example.com",
         "role": "student"
       }
     }
     ```

## Testing

1. Start your frontend development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login or signup page
3. Click the "Sign in with Google" button
4. Complete the Google authentication flow
5. You should be redirected to your dashboard upon successful authentication

## Troubleshooting

### Button doesn't appear
- Check that `VITE_GOOGLE_CLIENT_ID` is set in your `.env` file
- Verify the Google Identity Services script is loading (check browser console)
- Ensure your domain is added to authorized JavaScript origins

### Authentication fails
- Verify your backend endpoint `/api/auth/google` is working
- Check that the Google Client ID matches your OAuth credentials
- Ensure your redirect URIs are correctly configured in Google Cloud Console
- Check browser console and network tab for error messages

### CORS errors
- Make sure your backend allows requests from your frontend domain
- Verify authorized JavaScript origins in Google Cloud Console

## Security Notes

- Never commit your `.env` file to version control
- Keep your Google Client ID secure (though it's safe to expose in frontend code)
- Use HTTPS in production
- Regularly rotate your OAuth credentials

