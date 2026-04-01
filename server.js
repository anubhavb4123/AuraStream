// ============================================
// AuraStream — Express Proxy Server
// ============================================

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import http from 'http';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// --- Security: Rate Limiting ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use(limiter);

// --- CORS ---
app.use(cors({
  origin: FRONTEND_URL === '*' ? true : FRONTEND_URL,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type'],
  credentials: true,
}));

// --- URL Validation ---
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
const BLOCKED_IP_PREFIXES = [
  '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
  '172.30.', '172.31.', '192.168.', '169.254.',
];

function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return { allowed: false, reason: 'Local addresses are not allowed' };
    }
    for (const prefix of BLOCKED_IP_PREFIXES) {
      if (hostname.startsWith(prefix)) {
        return { allowed: false, reason: 'Private network addresses are not allowed' };
      }
    }
    if (urlString.length > 4096) {
      return { allowed: false, reason: 'URL is too long' };
    }
    
    // Basic validation to prevent open-proxy abuse targeting web pages
    const blockedExtensions = ['.html', '.htm', '.php', '.js', '.css', '.asp', '.jsp'];
    const path = url.pathname.toLowerCase();
    for (const ext of blockedExtensions) {
      if (path.endsWith(ext)) {
        return { allowed: false, reason: 'Only media files are allowed, not web pages or scripts.' };
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }
}

/**
 * Make an HTTP/HTTPS request using Node's native modules.
 * Follows redirects up to 5 times.
 */
function proxyRequest(targetUrl, method, reqHeaders, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const transport = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...reqHeaders,
      },
      timeout: 30000,
    };

    const req = transport.request(options, (res) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        let redirectUrl = res.headers.location;
        // Handle relative redirects
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, targetUrl).toString();
        }
        res.resume(); // Consume response to free up the socket
        proxyRequest(redirectUrl, method, reqHeaders, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      resolve(res);
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

// --- Proxy Endpoint ---
app.all('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  const validation = isUrlAllowed(targetUrl);
  if (!validation.allowed) {
    return res.status(403).json({ error: validation.reason });
  }

  try {
    const forwardHeaders = { ...req.headers };
    
    // Remove headers that should not be proxied downstream
    const headersToRemove = [
      'host', 'connection', 'x-forwarded-for', 'x-forwarded-proto',
      'x-forwarded-host', 'x-forwarded-port', 'x-real-ip',
      'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'true-client-ip',
      'forwarded', 'via'
    ];
    headersToRemove.forEach(h => delete forwardHeaders[h]);

    const method = req.method === 'HEAD' ? 'HEAD' : 'GET';

    console.log(`[Proxy] ${method} ${targetUrl.substring(0, 100)}...`);

    const upstream = await proxyRequest(targetUrl, method, forwardHeaders);

    // Forward status
    res.status(upstream.statusCode);

    // Forward relevant response headers
    const headersToForward = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'cache-control', 'etag', 'last-modified',
      'access-control-allow-origin'
    ];

    for (const header of headersToForward) {
      if (upstream.headers[header]) {
        res.set(header, upstream.headers[header]);
      }
    }

    // Explicitly set Accept-Ranges so the browser knows it can seek
    res.set('Accept-Ranges', 'bytes');

    // For HEAD requests, just send headers
    if (method === 'HEAD') {
      upstream.resume();
      return res.end();
    }

    // Pipe the response body to the client
    upstream.pipe(res);

    // Handle client disconnection
    req.on('close', () => {
      upstream.destroy();
    });

    upstream.on('error', (err) => {
      console.error('[Proxy] Upstream stream error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Stream error from upstream' });
      }
    });

  } catch (err) {
    console.error(`[Proxy] Error: ${err.message}`);

    if (err.message === 'Request timed out') {
      return res.status(504).json({ error: 'Upstream server timeout' });
    }

    if (!res.headersSent) {
      res.status(502).json({ error: `Failed to reach the upstream server: ${err.message}` });
    }
  }
});

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AuraStream Proxy', timestamp: Date.now() });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log('');
  console.log('  🌀 AuraStream Proxy Server');
  console.log(`  ➜ Listening on http://localhost:${PORT}`);
  console.log(`  ➜ Proxy endpoint: http://localhost:${PORT}/api/proxy?url=<encoded_url>`);
  console.log(`  ➜ Health check: http://localhost:${PORT}/api/health`);
  console.log('');
});
