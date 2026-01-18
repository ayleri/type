# Deployment Guide

This guide covers deploying Typrace to production using Vercel (frontend), Google Cloud Run (backend), and MongoDB Atlas (database).

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Google Cloud Platform account with billing enabled
- MongoDB Atlas account (free tier available)

## Database Setup (MongoDB Atlas)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist all IP addresses (0.0.0.0/0) for Cloud Run access
4. Copy your connection string (looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`)

## Backend Deployment (Google Cloud Run)

### Initial Setup

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

2. Create a new GCP project:
   ```bash
   gcloud projects create typrace-backend --name="Typrace Backend"
   gcloud config set project typrace-backend
   ```

3. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

4. Create a service account for GitHub Actions:
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"
   
   gcloud projects add-iam-policy-binding typrace-backend \
     --member="serviceAccount:github-actions@typrace-backend.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding typrace-backend \
     --member="serviceAccount:github-actions@typrace-backend.iam.gserviceaccount.com" \
     --role="roles/cloudbuild.builds.editor"
   
   gcloud projects add-iam-policy-binding typrace-backend \
     --member="serviceAccount:github-actions@typrace-backend.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@typrace-backend.iam.gserviceaccount.com
   ```

5. Add the content of `key.json` as a GitHub secret named `GCP_SA_KEY`

### Manual Deployment (First Time)

```bash
cd Backend
gcloud builds submit --tag gcr.io/typrace-backend/typrace-backend
gcloud run deploy typrace-backend \
  --image gcr.io/typrace-backend/typrace-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGO_URI=your-mongodb-atlas-uri,JWT_SECRET_KEY=your-secret-key
```

After deployment, note the service URL (e.g., `https://typrace-backend-xxxxx.run.app`)

## Frontend Deployment (Vercel)

### Initial Setup

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   cd frontend
   vercel link
   ```

3. Set environment variable:
   ```bash
   vercel env add VITE_API_URL
   # Enter your Cloud Run backend URL (e.g., https://typrace-backend-xxxxx.run.app)
   ```

4. Get your Vercel credentials for GitHub Actions:
   ```bash
   # Get org and project IDs from .vercel/project.json
   cat .vercel/project.json
   ```

5. Add GitHub secrets:
   - `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens
   - `VERCEL_ORG_ID`: From the command above
   - `VERCEL_PROJECT_ID`: From the command above

### Manual Deployment (First Time)

```bash
cd frontend
vercel --prod
```

## GitHub Actions Setup

The repository is configured with automatic deployments on push to `main`. Ensure these secrets are set in your GitHub repository:

- `GCP_SA_KEY`: Google Cloud service account key (JSON)
- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

## Environment Variables

### Backend (Google Cloud Run)
- `MONGO_URI`: MongoDB Atlas connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens (generate a strong random string)
- `PORT`: 8080 (default for Cloud Run)

### Frontend (Vercel)
- `VITE_API_URL`: Your Cloud Run backend URL

## Custom Domain (Optional)

### Vercel (Frontend)
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain and follow DNS instructions

### Google Cloud Run (Backend)
1. Go to Cloud Run service settings
2. Click "Manage Custom Domains"
3. Follow instructions to map your domain

## Monitoring and Logs

- **Backend logs**: `gcloud run services logs read typrace-backend --project=typrace-backend`
- **Frontend logs**: Available in Vercel dashboard
- **Database monitoring**: MongoDB Atlas dashboard

## Costs

- **MongoDB Atlas**: Free tier (512 MB storage)
- **Vercel**: Free tier (100 GB bandwidth/month)
- **Google Cloud Run**: Free tier (2 million requests/month, 360,000 GB-seconds)

Expected cost for moderate usage: **$0-5/month**

## Troubleshooting

### CORS Issues
Ensure your Flask backend has CORS enabled for your Vercel domain:
```python
from flask_cors import CORS
CORS(app, origins=['https://your-vercel-domain.vercel.app'])
```

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check connection string format and credentials
- Ensure database user has proper permissions

### Environment Variables Not Loading
- Verify all secrets are set in GitHub repository settings
- Check that environment variables are set in Vercel and Cloud Run
- Restart services after updating environment variables
