# Vercel Deployment Guide

This guide will help you deploy the Unified Academic Portal on Vercel.

## Architecture Overview

This is a full-stack application with:

- **Frontend**: React + Vite (deploy on Vercel)
- **Backend**: Node.js + Express (deploy separately - see options below)

## Deployment Options

### Option 1: Frontend on Vercel + Backend on Separate Service (Recommended)

This is the recommended approach for your current architecture.

#### Step 1: Deploy Frontend on Vercel

1. **Install Vercel CLI** (optional, but recommended):

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

4. **Deploy**:

   ```bash
   vercel
   ```

   Or use the Vercel dashboard:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `frontend`
   - Configure build settings (auto-detected for Vite)

5. **Configure Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.com/api`
     - Replace with your actual backend URL

#### Step 2: Deploy Backend (Choose one option)

##### Option A: Railway (Recommended for Node.js)

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. Set **Root Directory** to `backend`
5. Add environment variables:
   ```
   DATABASE_URL=your_postgresql_url
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   PORT=4000
   NODE_ENV=production
   ```
6. Railway will auto-detect Node.js and deploy

##### Option B: Render

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables (same as Railway)
6. Deploy

##### Option C: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set buildpack: `heroku buildpacks:set heroku/nodejs`
5. Set root: `heroku config:set PROJECT_PATH=backend`
6. Add environment variables
7. Deploy: `git push heroku main`

#### Step 3: Update Frontend API URL

After backend is deployed, update the frontend environment variable:

- In Vercel Dashboard → Environment Variables
- Update `VITE_API_BASE_URL` to your backend URL
- Redeploy frontend

---

### Option 2: Full-Stack on Vercel (Advanced)

This requires refactoring the backend to use Vercel Serverless Functions.

**Note**: This is more complex and requires significant changes to your backend code.

1. Create `api/` directory in project root
2. Convert Express routes to serverless functions
3. Use Vercel's serverless function format
4. Deploy entire project

**Not recommended** for your current architecture unless you want to refactor.

---

## Step-by-Step: Frontend Deployment (Detailed)

### Using Vercel Dashboard (Easiest)

1. **Prepare your repository**:
   - Ensure all changes are committed and pushed to GitHub
   - Make sure `frontend/vercel.json` exists

2. **Go to Vercel Dashboard**:
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub

3. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

5. **Environment Variables**:
   - Click "Environment Variables"
   - Add:
     ```
     VITE_API_BASE_URL = https://your-backend-url.com/api
     ```
   - For production, preview, and development

6. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login
vercel login

# Navigate to frontend
cd frontend

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

---

## Environment Variables Setup

### Frontend (Vercel)

| Variable            | Description     | Example                                |
| ------------------- | --------------- | -------------------------------------- |
| `VITE_API_BASE_URL` | Backend API URL | `https://your-backend.railway.app/api` |

### Backend (Railway/Render/Heroku)

| Variable                | Description                  | Required            |
| ----------------------- | ---------------------------- | ------------------- |
| `DATABASE_URL`          | PostgreSQL connection string | ✅ Yes              |
| `JWT_SECRET`            | Secret for JWT tokens        | ✅ Yes              |
| `GROQ_API_KEY`          | Groq AI API key              | ✅ Yes              |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name        | ✅ Yes              |
| `CLOUDINARY_API_KEY`    | Cloudinary API key           | ✅ Yes              |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret        | ✅ Yes              |
| `AWS_ACCESS_KEY_ID`     | AWS access key               | ⚠️ Optional         |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key               | ⚠️ Optional         |
| `PORT`                  | Server port                  | ⚠️ Auto-set         |
| `NODE_ENV`              | Environment                  | ✅ Yes (production) |

---

## CORS Configuration

Make sure your backend allows requests from your Vercel domain:

In `backend/server.js` or your CORS configuration:

```javascript
const corsOptions = {
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com',
    'http://localhost:5173', // for local development
  ],
  credentials: true,
};
```

---

## Custom Domain Setup

1. **In Vercel Dashboard**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Backend CORS**:
   - Add your custom domain to allowed origins

3. **Update Environment Variables**:
   - Update `VITE_API_BASE_URL` if needed

---

## Post-Deployment Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway/Render/Heroku
- [ ] Environment variables configured
- [ ] CORS configured on backend
- [ ] Database connection working
- [ ] API endpoints accessible
- [ ] Frontend can connect to backend
- [ ] Authentication working
- [ ] File uploads working (if using Cloudinary/S3)
- [ ] Custom domain configured (optional)
- [ ] SSL certificates active (automatic on Vercel)

---

## Troubleshooting

### Frontend Build Fails

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Check for TypeScript errors: `npm run type-check`
4. Verify Node.js version (should be 18+)

### Backend Connection Issues

1. Verify `VITE_API_BASE_URL` is correct
2. Check backend CORS configuration
3. Verify backend is running and accessible
4. Check backend logs for errors

### Environment Variables Not Working

1. Ensure variables start with `VITE_` for Vite
2. Redeploy after adding variables
3. Check variable names match exactly

### CORS Errors

1. Add Vercel domain to backend CORS origins
2. Check backend CORS middleware configuration
3. Verify credentials are set correctly

---

## Monitoring and Analytics

### Vercel Analytics (Optional)

1. Enable in Vercel Dashboard → Analytics
2. Add to `frontend/index.html`:
   ```html
   <script>
     window.va =
       window.va ||
       function () {
         (window.va.q = window.va.q || []).push(arguments);
       };
   </script>
   <script defer src="/_vercel/insights/script.js"></script>
   ```

### Backend Monitoring

- Use Railway/Render built-in logs
- Set up error tracking (Sentry, etc.)
- Monitor database connections

---

## Continuous Deployment

Vercel automatically deploys on:

- Push to `main` branch (production)
- Push to other branches (preview deployments)
- Pull requests (preview deployments)

Backend services (Railway/Render) also support:

- Auto-deploy from GitHub
- Manual deployments
- Rollback capabilities

---

## Cost Considerations

### Vercel (Frontend)

- **Free Tier**:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Perfect for most projects

### Railway (Backend)

- **Free Tier**: $5 credit/month
- **Hobby**: $5/month for 512MB RAM
- Scales as needed

### Render (Backend)

- **Free Tier**:
  - Spins down after 15min inactivity
  - Good for development
- **Starter**: $7/month for always-on

---

## Support

For issues:

- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Railway: [docs.railway.app](https://docs.railway.app)
- Render: [render.com/docs](https://render.com/docs)

---

**Last Updated**: 2025-01-14
