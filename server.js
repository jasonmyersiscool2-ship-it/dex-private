// DEX PRIVATE Combined Server + Frontend
// Save as server.js

const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// ---- FRONTEND SERVE ----
app.use(express.static(path.join(__dirname, "public")));

// ---- PROXY CONFIG ----
const prefix = "/service";
const sites = {
  playjs13: "https://play.js13kgames.com/spacebar-clicker/",
  google: "https://www.google.com/",
  docs: "https://docs.google.com/",
  youtube: "https://www.youtube.com/"
};

// Utility function to rewrite HTML/JS content
function rewriteContent(body, baseUrl) {
  body = body.replace(/https?:\/\/sites\.google\.com/g, prefix);
  body = body.replace(/https?:\/\/www\.google\.com/g, prefix);
  body = body.replace(/https?:\/\/accounts\.google\.com/g, prefix);

  const patterns = [
    'href="/', 'href='/',
    'src="/', 'src='/',
    'url(/', 'url('/', 'url("/',
    'action="/', 'action='/',
    'data-url="/', 'data-url='/',
    'data-src="/', 'data-src='/'
  ];

  patterns.forEach(pattern => {
    body = body.replace(new RegExp(pattern, 'g'), `${pattern}${prefix}/`);
  });

  body = body.replace(/\.location\s*=\s*["'](\/[^"']*)/g, `.location="/${baseUrl}$1`);
  body = body.replace(/\.location\.href\s*=\s*["'](\/[^"']*)/g, `.location.href="/${baseUrl}$1`);
  body = body.replace(/\.location\.replace\(["'](\/[^"']*)/g, `.location.replace("/${baseUrl}$1`);
  body = body.replace(/\.location\.assign\(["'](\/[^"']*)/g, `.location.assign("/${baseUrl}$1`);
  body = body.replace(/window\.open\(["'](\/[^"']*)/g, `window.open("/${baseUrl}$1`);

  body = body.replace(/"\/\/www\.gstatic\.com/g, `"//${baseUrl}/www.gstatic.com`);
  body = body.replace(/"\/\/fonts\.gstatic\.com/g, `"//${baseUrl}/fonts.gstatic.com`);
  body = body.replace(/<meta\s+content="\/\/sites\.google\.com/g, `<meta content="//${baseUrl}/sites.google.com`);

  return body;
}

// Dynamic Proxy Route
app.use(`${prefix}/:site`, (req, res, next) => {
  const siteKey = req.params.site;
  const target = sites[siteKey];

  if (!target) return res.status(404).send("Unknown site.");

  const proxyOptions = {
    target,
    changeOrigin: true,
    secure: false,
    followRedirects: true,
    ws: true,
    xfwd: true,
    proxyTimeout: 60000,
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('Host', new URL(target).host);
      proxyReq.setHeader('Origin', target);
      proxyReq.setHeader('Referer', target);
    },
    onProxyRes: (proxyRes, req, res) => {
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-content-type-options'];
      delete proxyRes.headers['strict-transport-security'];

      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-methods'] = '*';
      proxyRes.headers['access-control-allow-headers'] = '*';

      if (proxyRes.headers.location) {
        proxyRes.headers.location = prefix + proxyRes.headers.location.replace(target, "");
      }

      const contentType = proxyRes.headers["content-type"] || "";
      if (
        contentType.includes("text/html") ||
        contentType.includes("javascript") ||
        contentType.includes("text/css") ||
        contentType.includes("json")
      ) {
        let body = "";
        proxyRes.on("data", chunk => (body += chunk));
        proxyRes.on("end", () => {
          const baseUrl = new URL(target).host;
          body = rewriteContent(body, baseUrl);
          res.end(body);
        });
      } else {
        proxyRes.pipe(res);
      }
    }
  };

  createProxyMiddleware(proxyOptions)(req, res, next);
});

// ---- START SERVER ----
const PORT = 3000;
app.listen(PORT, () => {
  console.log("DEX PRIVATE running at http://localhost:" + PORT);
});
