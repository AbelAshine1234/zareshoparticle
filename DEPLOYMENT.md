# Vercel Deployment Guide

## Prerequisites

1. A Vercel account (free at [vercel.com](https://vercel.com))
2. A Cloudinary account (free at [cloudinary.com](https://cloudinary.com))
3. Your project code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables

You'll need to set these environment variables in your Vercel dashboard:

- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key  
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- `NODE_ENV` - Set to `production`

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect your repository:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project"
   - Import your Git repository
   - Vercel will automatically detect the project structure

2. **Configure the project:**
   - **Root Directory:** Leave as default (root of repository)
   - **Build Command:** `npm run build` (will build the client)
   - **Output Directory:** `client/dist`
   - **Install Command:** `npm run install-all`

3. **Set environment variables:**
   - In the Vercel dashboard, go to your project settings
   - Navigate to "Environment Variables"
   - Add the Cloudinary variables listed above

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add CLOUDINARY_CLOUD_NAME
   vercel env add CLOUDINARY_API_KEY
   vercel env add CLOUDINARY_API_SECRET
   vercel env add NODE_ENV
   ```

## Important Notes

### Data Storage
- The current setup uses in-memory storage for development
- **Data will be lost on each serverless function restart**
- For production, consider using:
  - Vercel KV (Redis)
  - MongoDB Atlas
  - PostgreSQL with Vercel Postgres
  - Supabase

### File Uploads
- Images are uploaded to Cloudinary
- Make sure your Cloudinary account has sufficient storage

### Authentication
- Uses simple token-based authentication
- Tokens are stored in memory (will be lost on restart)
- Consider implementing persistent session storage

## Local Development

To run locally:

```bash
# Install dependencies
npm run install-all

# Start development servers
npm run dev
```

This will start:
- Backend server on http://localhost:4000
- Frontend dev server on http://localhost:5173

## Troubleshooting

### Build Errors
- Ensure all dependencies are properly installed
- Check that Node.js version is 18+ 
- Verify environment variables are set correctly

### API Errors
- Check Vercel function logs in the dashboard
- Ensure Cloudinary credentials are correct
- Verify CORS settings if making requests from different domains

### Database Issues
- Remember that in-memory storage resets on each deployment
- Consider migrating to a persistent database for production use
