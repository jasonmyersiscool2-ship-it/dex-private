// server.js
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Serve static files (e.g., index.html)
app.use(express.static("public"));

// Single proxy route: dynamically loads any URL
app.get("/proxy", (req, res, next) => {
  const target = req.query.url; // The target URL (e.g., google.com)

  if (!target) return res.status(400).send("Missing 'url' parameter");

  // Basic validation: Only allow HTTP/HTTPS URLs
  if (!/^https?:\/\//.test(target)) {
    return res.status(400).send("Invalid URL");
  }

  // Create the proxy middleware for this target URL
  createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    selfHandleResponse: false,
    onProxyRes: (proxyRes, req, res) => {
      // Remove headers that prevent embedding (iframe restrictions)
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    }
  })(req, res, next);
});

// Set up the server to listen on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`DEX PRIVATE running on http://localhost:${PORT}`);
});
