# voidproxy

A self-hosted web proxy that runs on Render and exposes itself via an ngrok tunnel.

## How it works

1. Render starts the Node.js server on port 3000
2. `start.js` launches an ngrok tunnel pointing at port 3000
3. ngrok prints a public URL (e.g. `https://abc123.ngrok.io`)
4. Visit that URL to use the proxy

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node start.js`
5. Add environment variable:
   - `NGROK_AUTHTOKEN` = your ngrok auth token (get it free at [ngrok.com](https://ngrok.com))
6. Deploy!

## Getting the ngrok URL

After deploy, check the **Render logs** — it will print something like:

```
========================================
  PROXY IS LIVE!
  URL: https://abc123.ngrok-free.app
========================================
```

Visit that URL in your browser to use the proxy.

## Notes

- The ngrok URL changes every time Render restarts the service
- Render free tier sleeps after 15 min of inactivity — first load after sleep takes ~30s
- To keep it awake, use a free uptime monitor like [UptimeRobot](https://uptimerobot.com) pinging your ngrok URL (or the render internal URL)
- For a stable URL, upgrade to ngrok paid tier and set a reserved domain

## Getting your ngrok auth token

1. Sign up free at [ngrok.com](https://ngrok.com)
2. Go to Your Authtoken in the dashboard
3. Copy the token and set it as `NGROK_AUTHTOKEN` in Render environment variables
