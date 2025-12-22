# Quick Start: Deploy to Vercel

## 🚀 Fastest Way to Deploy

### 1. Deploy Frontend (5 minutes)

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

2. **Click "Add New Project"**

3. **Import your repository**

4. **Configure**:
   - **Root Directory**: `frontend`
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. **Add Environment Variable**:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-backend-url.com/api` (you'll update this after backend is deployed)

6. **Click "Deploy"**

✅ Your frontend is now live at `https://your-project.vercel.app`

---

### 2. Deploy Backend (10 minutes)

#### Option A: Railway (Easiest)

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **Click "New Project"** → **"Deploy from GitHub repo"**

3. **Select your repository**

4. **Configure**:
   - **Root Directory**: `backend`
   - Railway auto-detects Node.js

5. **Add Environment Variables** (Settings → Variables):

   ```
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_secret_key_here
   GROQ_API_KEY=your_groq_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   NODE_ENV=production
   ```

6. **Deploy** - Railway will automatically deploy

7. **Get your backend URL** from Railway dashboard (e.g., `https://your-app.railway.app`)

#### Option B: Render

1. **Go to [render.com](https://render.com)** and sign in

2. **New** → **Web Service**

3. **Connect GitHub** and select your repo

4. **Configure**:
   - **Name**: `unified-academic-portal-backend`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. **Add Environment Variables** (same as Railway)

6. **Create Web Service**

---

### 3. Connect Frontend to Backend

1. **Go back to Vercel Dashboard**

2. **Settings** → **Environment Variables**

3. **Update** `VITE_API_BASE_URL`:
   - Value: `https://your-backend-url.railway.app/api` (or Render URL)

4. **Redeploy** frontend (automatic or manual)

---

### 4. Update Backend CORS

Update `backend/server.js` CORS configuration to allow your Vercel domain:

```javascript
cors({
  origin: [
    'https://your-project.vercel.app',
    'https://your-custom-domain.com', // if you have one
    'http://localhost:5173', // for local dev
  ],
  credentials: true,
});
```

Then redeploy backend.

---

## ✅ You're Done!

Your app should now be:

- ✅ Frontend: `https://your-project.vercel.app`
- ✅ Backend: `https://your-backend.railway.app`
- ✅ Connected and working!

---

## 🔧 Troubleshooting

**Frontend can't connect to backend?**

- Check `VITE_API_BASE_URL` is correct
- Verify backend CORS allows Vercel domain
- Check backend is running (check Railway/Render logs)

**Build fails?**

- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally to test

**CORS errors?**

- Add Vercel domain to backend CORS origins
- Redeploy backend after CORS changes

---

For detailed instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
