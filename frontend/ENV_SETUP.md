# Environment Variables Setup

## Frontend Environment Variables

Create a `.env` file in the `frontend` directory with the following variables:

```env
# Google OAuth Configuration
# Get your Client ID from Google Cloud Console
# See GOOGLE_OAUTH_SETUP.md for detailed instructions
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# API URL (optional, defaults to http://localhost:4000)
# VITE_API_URL=http://localhost:4000
```

## Backend Environment Variables

Create a `.env` file in the `backend` directory (if it doesn't exist) and add:

```env
# Google OAuth Configuration (optional but recommended for security)
# Should match the Client ID used in frontend
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# JWT Secret (should already exist)
JWT_SECRET=your-jwt-secret-here

# Database URL (should already exist)
DATABASE_URL=your-database-url-here
```

## Notes

- The `GOOGLE_CLIENT_ID` in the backend is optional but recommended. If set, it will verify that tokens are from the expected Google OAuth client.
- Never commit `.env` files to version control.
- Copy this file to create your actual `.env` file.

