# Raksha Signal — Smart Emergency Alert & Safety System

A real-time SOS web app: one tap shares live GPS location over Socket.io and
surfaces nearby hospitals/police stations via the Google Maps Places API.

## Local setup

```bash
npm install
cp .env.example .env
# then edit .env with your MongoDB URI and Google Maps API key
npm run dev
```

Open http://localhost:5000

Before it'll work you need to:
1. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `public/index.html` with your real key
   (needs **Maps JavaScript API** and **Places API** enabled).
2. Set `MONGO_URI` and `GOOGLE_MAPS_API_KEY` in `.env`.

## Deploying for free — Render + MongoDB Atlas

This project is a single Express service (it serves the frontend as static
files from `/public`), so you only need to deploy one thing.

### 1. Create a free MongoDB database (MongoDB Atlas)
1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free **M0 cluster**.
3. Under **Database Access**, add a database user with a username/password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Render can connect.
5. Click **Connect > Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/raksha_signal?retryWrites=true&w=majority`

### 2. Get a Google Maps API key
1. Go to https://console.cloud.google.com/ and create a project.
2. Enable **Maps JavaScript API** and **Places API**.
3. Create an API key under **Credentials**.
4. Restrict the key to your Render domain once deployed (HTTP referrers) to keep it safe.

### 3. Push the code to GitHub
```bash
cd raksha-signal
git init
git add .
git commit -m "Initial commit - Raksha Signal"
git branch -M main
git remote add origin https://github.com/<your-username>/raksha-signal.git
git push -u origin main
```

### 4. Deploy on Render (free tier)
1. Go to https://render.com and sign up/log in with GitHub.
2. Click **New > Web Service**, select your `raksha-signal` repo.
3. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add environment variables under the **Environment** tab:
   - `MONGO_URI` = your Atlas connection string
   - `GOOGLE_MAPS_API_KEY` = your Maps API key
   - (leave `PORT` unset — Render sets this automatically)
5. Click **Create Web Service**. Render will build and deploy; you'll get a
   URL like `https://raksha-signal.onrender.com`.
6. Update your Google Maps API key's HTTP referrer restriction to that domain.

**Note on the free tier:** Render's free web services spin down after 15
minutes of inactivity and take ~30–60 seconds to wake back up on the next
request — fine for a demo/portfolio project, not for production.

### Alternative free hosts
- **Railway** (railway.app) — similar flow, free trial credits, good Socket.io support.
- **Cyclic** or **Fly.io** — also support long-lived Node/WebSocket processes.
- Avoid Vercel/Netlify for the backend — they're serverless and don't support
  persistent Socket.io connections well. You could still use them to host a
  *separate* static frontend if you split the project, but keeping everything
  in one Express service (as this project does) is simpler for a free deploy.

## Project structure

See the directory tree in the chat response, or run `ls -R` in the project root.

## API summary

| Method | Route                     | Description                          |
|--------|---------------------------|---------------------------------------|
| POST   | `/api/sos`                 | Start a new SOS alert                |
| GET    | `/api/sos/:id`              | Fetch an SOS record                  |
| PUT    | `/api/sos/:id/location`     | Update live location, broadcasts via Socket.io |
| DELETE | `/api/sos/:id`              | Resolve/end an SOS session           |
| POST   | `/api/user`                 | Create a user                        |
| GET    | `/api/user/:id`             | Fetch a user profile                 |
| GET    | `/api/nearby?lat=&lng=&type=`| Nearby hospitals/police via Google Places |

## Notes / next steps
- `userId` is hardcoded to `'demo-user'` in `public/script.js` — wire up real
  auth (e.g. JWT + `/api/user`) before using this beyond a demo.
- Emergency-contact SMS/push notifications aren't implemented yet — see the
  "Future Enhancements" ideas (Twilio for SMS is a common free-tier option).
