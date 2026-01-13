# 🚀 Free Deployment Guide for MailGen

This guide will help you deploy MailGen for **FREE** using:

- **Frontend**: Vercel (React)
- **Backend**: Render (FastAPI)

---

## 📋 Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free, no credit card)
3. **Render Account** - Sign up at [render.com](https://render.com) (free, no credit card)

---

## Step 1: Push to GitHub

If not already on GitHub:

```bash
cd /home/cis/task-Automation/frontend-react
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `mailgen-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.2 Set Environment Variables

In Render dashboard, add these environment variables:

| Key                   | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| `PYTHON_VERSION`      | `3.11`                                                     |
| `ALLOWED_ORIGINS`     | `*` (update later with Vercel URL)                         |
| `FRONTEND_URL`        | (set after Vercel deployment)                              |
| `MOCK_GMAIL`          | `true`                                                     |
| `GMAIL_CLIENT_ID`     | (your Google OAuth client ID)                              |
| `GMAIL_CLIENT_SECRET` | (your Google OAuth client secret)                          |
| `GMAIL_REDIRECT_URI`  | `https://your-app.onrender.com/api/v1/auth/gmail/callback` |

### 2.3 Deploy

Click **"Create Web Service"**. Wait for deployment (5-10 minutes on free tier).

Your backend URL will be: `https://mailgen-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `.` (root, not backend)

### 3.2 Set Environment Variables

Add this environment variable:

| Key                 | Value                                         |
| ------------------- | --------------------------------------------- |
| `REACT_APP_API_URL` | `https://mailgen-backend.onrender.com/api/v1` |

### 3.3 Deploy

Click **"Deploy"**. Wait for deployment (2-3 minutes).

Your frontend URL will be: `https://your-project.vercel.app`

---

## Step 4: Update Backend with Frontend URL

Go back to Render and update these environment variables:

| Key               | New Value                         |
| ----------------- | --------------------------------- |
| `FRONTEND_URL`    | `https://your-project.vercel.app` |
| `ALLOWED_ORIGINS` | `https://your-project.vercel.app` |

---

## Step 5: Configure Google OAuth (Optional)

If you want Gmail integration to work:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. **Authorized redirect URIs**: Add `https://mailgen-backend.onrender.com/api/v1/auth/gmail/callback`
6. Copy the Client ID and Secret to Render environment variables

---

## ⚠️ Important Notes

### Free Tier Limitations

**Render Free Tier:**

- App sleeps after 15 minutes of inactivity
- ~750 hours/month
- First request after sleep takes 30-60 seconds (cold start)

**Vercel Free Tier:**

- 100GB bandwidth/month
- Serverless functions limited to 10 seconds
- Great for static React apps ✓

### Token Storage

The current implementation stores Gmail tokens in a local file (`token.json`). On Render's free tier, this file will be **lost on every deploy/restart**. Users will need to re-authenticate.

**To persist tokens**, consider:

- MongoDB Atlas (free tier available)
- Supabase (free tier available)
- Store tokens in environment variables (not recommended for production)

---

## 🎉 You're Done!

Your MailGen app is now live:

- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://mailgen-backend.onrender.com`

---

## Troubleshooting

### CORS Errors

- Ensure `ALLOWED_ORIGINS` in Render includes your Vercel URL
- Make sure there are no trailing slashes

### Gmail OAuth Not Working

- Check `GMAIL_REDIRECT_URI` matches exactly what's in Google Cloud Console
- Ensure `FRONTEND_URL` is set correctly for redirects

### Backend Not Responding

- Free tier backend may be sleeping. Wait 30-60 seconds.
- Check Render logs for errors
