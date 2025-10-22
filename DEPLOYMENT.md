# 🕷️ Web Crawler - Production Deployment Guide

## 🚀 Deployment Options

### Option 1: Render (Recommended) ✅

**Why Render?**

- Native support for PostgreSQL and Redis
- Background job processing (BullMQ)
- Playwright browser automation support
- Free tier available
- Easy environment management

### Option 2: Vercel (Not Recommended) ❌

**Limitations:**

- No persistent databases (PostgreSQL)
- No Redis support
- No background job processing
- Serverless functions only (timeouts)
- No browser automation support

---

## 📋 Render Deployment Steps

### 1. Prepare Your Repository

```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy on Render

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Click "New +"** → **"Blueprint"**
3. **Connect your GitHub repository**
4. **Render will automatically detect the `render.yaml` file**
5. **Click "Deploy"**

### 3. Environment Variables (Auto-configured)

The following will be automatically set:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NODE_ENV=production`
- `PLAYWRIGHT_HEADLESS=true`

### 4. Services Created

- **Web App**: Your main application
- **PostgreSQL**: Database (Free 90-day trial)
- **Redis**: Queue management (Free tier)

---

## 🔧 Manual Render Setup (Alternative)

If you prefer manual setup:

### 1. Create Web Service

- **Name**: `web-crawler-app`
- **Environment**: `Node`
- **Build Command**: `chmod +x build.sh && ./build.sh`
- **Start Command**: `npm run start:prod`

### 2. Create PostgreSQL Database

- **Name**: `web-crawler-db`
- **Plan**: `Starter (Free)`

### 3. Create Redis Service

- **Name**: `web-crawler-redis`
- **Plan**: `Starter (Free)`

### 4. Set Environment Variables

```
NODE_ENV=production
PLAYWRIGHT_HEADLESS=true
DATABASE_URL=[Auto-generated from PostgreSQL]
REDIS_URL=[Auto-generated from Redis]
```

---

## 🌐 Vercel Alternative (Frontend Only)

If you want to use Vercel for just the frontend:

1. **Split the project**:
   - Deploy backend on Render
   - Deploy frontend on Vercel

2. **Update frontend API calls** to point to Render backend URL

---

## 🔍 Production Checklist

- [ ] Environment variables configured
- [ ] PostgreSQL database connected
- [ ] Redis service running
- [ ] Playwright browsers installed
- [ ] Database migrations applied
- [ ] CORS configured for production domain
- [ ] SSL/HTTPS enabled (automatic on Render)

---

## 🚀 Quick Deploy Commands

```bash
# 1. Commit changes
git add .
git commit -m "Production deployment setup"
git push origin main

# 2. Go to render.com and deploy using Blueprint (render.yaml)
```

---

## 📊 Expected Costs

### Render (Recommended)

- **Web Service**: Free for 750 hours/month
- **PostgreSQL**: Free 90-day trial, then $7/month
- **Redis**: Free 25MB, then $7/month

### Total: ~$14/month after free trial

---

## 🔧 Troubleshooting

### Common Issues:

1. **Build failures**: Check build logs in Render dashboard
2. **Database connection**: Verify DATABASE_URL is set
3. **Redis connection**: Verify REDIS_URL is set
4. **Playwright errors**: Browsers should install automatically

### Debug Commands:

```bash
# Check environment
echo $NODE_ENV
echo $DATABASE_URL
echo $REDIS_URL

# Check processes
ps aux | grep node
```

---

## 🎯 Next Steps After Deployment

1. **Test the application** at your Render URL
2. **Set up custom domain** (if needed)
3. **Configure monitoring** and logging
4. **Set up automated backups** for PostgreSQL
5. **Monitor resource usage** and scale as needed

---

Ready to deploy! 🚀
