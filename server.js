const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Proxy endpoint - fetches any URL server-side
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("No URL provided");

  try {
    const url = new URL(target);

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    };

    const response = await fetch(target, { headers, redirect: "follow" });
    const contentType = response.headers.get("content-type") || "";

    // For HTML pages, rewrite URLs to go through proxy
    if (contentType.includes("text/html")) {
      let html = await response.text();
      const base = `${url.protocol}//${url.host}`;

      // Inject base rewriting script
      const script = `
<script>
(function() {
  const PROXY = window.location.origin + '/proxy?url=';
  const BASE = '${base}';
  const ORIGIN = '${url.origin}';

  function rewrite(u) {
    if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:') || u.startsWith('#')) return u;
    if (u.startsWith('//')) return PROXY + encodeURIComponent('https:' + u);
    if (u.startsWith('http://') || u.startsWith('https://')) return PROXY + encodeURIComponent(u);
    if (u.startsWith('/')) return PROXY + encodeURIComponent(BASE + u);
    return PROXY + encodeURIComponent(BASE + '/' + u);
  }

  // Intercept fetch
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') input = rewrite(input);
    return origFetch(input, init);
  };

  // Intercept XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    return origOpen.call(this, method, rewrite(url), ...args);
  };

  // Rewrite link clicks
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith(window.location.origin)) {
      e.preventDefault();
      window.location.href = PROXY + encodeURIComponent(a.href);
    }
  }, true);

  // Rewrite form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    let action = form.action || window.location.href;
    if (!action.startsWith(window.location.origin)) {
      e.preventDefault();
      const data = new FormData(form);
      const params = new URLSearchParams(data).toString();
      if (form.method.toLowerCase() === 'post') {
        fetch(PROXY + encodeURIComponent(action), {
          method: 'POST',
          body: params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(r => r.text()).then(html => {
          document.open(); document.write(html); document.close();
        });
      } else {
        window.location.href = PROXY + encodeURIComponent(action + '?' + params);
      }
    }
  }, true);
})();
</script>`;

      // Rewrite src/href attributes
      html = html
        .replace(/(src|href|action)=["'](?!data:|blob:|javascript:|#|mailto:)([^"']+)["']/gi, (match, attr, val) => {
          val = val.trim();
          let abs;
          if (val.startsWith("http://") || val.startsWith("https://")) abs = val;
          else if (val.startsWith("//")) abs = "https:" + val;
          else if (val.startsWith("/")) abs = base + val;
          else abs = base + "/" + val;
          return `${attr}="/proxy?url=${encodeURIComponent(abs)}"`;
        })
        .replace(/<head>/i, `<head><base href="${base}/">${script}`);

      res.setHeader("Content-Type", "text/html");
      res.setHeader("X-Frame-Options", "");
      res.setHeader("Content-Security-Policy", "");
      return res.send(html);
    }

    // For non-HTML (images, CSS, JS, fonts, etc.), stream directly
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send(`Proxy error: ${err.message}`);
  }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
