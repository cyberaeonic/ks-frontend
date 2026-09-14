# 🚀 Deployment Guide — Sree Meenakshi Handicrafts

## Architecture
- **Frontend** → Netlify (free) → your Namecheap domain
- **Backend API** → Render.com (free)
- **Database** → Supabase (free PostgreSQL)

---

## Step 1: Database — Supabase (Free)
1. Go to https://supabase.com → Sign up
2. Create new project → Region: Southeast Asia (Singapore)
3. Settings → Database → Copy "Connection String (URI)"
4. Replace [YOUR-PASSWORD] with your project password
5. Save this URL — you need it in Step 2

---

## Step 2: Backend — Render.com (Free)
1. Push this repo to GitHub
2. Go to https://render.com → New Web Service → Connect repo
3. Settings:
   - Root Directory: server
   - Build Command: npm install && npx prisma generate && npx prisma migrate deploy
   - Start Command: npm start
4. Add environment variables:
   - DATABASE_URL = (paste Supabase connection string)
   - RAZORPAY_KEY_SECRET = (from Razorpay dashboard)
   - FRONTEND_URL = https://YOUR-DOMAIN.com
   - NODE_ENV = production
5. Deploy → Note your URL: https://krishika-api.onrender.com

---

## Step 3: Frontend — Netlify (Free)
1. Push frontend folder to a separate GitHub repo
2. Go to https://netlify.com → Import from Git
3. Build settings: leave blank (static site), publish dir: .
4. Deploy → you get https://your-site.netlify.app

---

## Step 4: Connect Namecheap Domain
1. Netlify → Site Settings → Domain Management → Add custom domain
2. Type your domain → Netlify shows you 2 nameservers
3. Namecheap → Domain → Manage → Nameservers → Custom DNS
4. Paste Netlify nameservers → Save
5. Wait 10-30 minutes → SSL auto-activates ✅

---

## Step 5: Update FRONTEND_URL in Render
Once domain is live, update FRONTEND_URL env variable in Render to:
https://YOUR-REAL-DOMAIN.com
Then redeploy.
