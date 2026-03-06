/// <reference types="@fastly/js-compute" />
import { includeBytes } from "fastly:experimental";
import { Backend } from "fastly:backend";
import { CDN } from './cdn.mjs';

const htmlPage = includeBytes("./src/index.html");
const cssStyles = includeBytes("./src/styles.css");

// Parse the CDN registry at startup — stays private inside the WASM binary.
const registry = JSON.parse(new TextDecoder().decode(includeBytes("./data/cdns.json")));

// Merge all CDN-specific debug request headers so we send them all on every
// outbound HEAD request (we don't know which CDN we'll hit in advance).
const debugRequestHeaders = {};
for (const cdn of Object.values(registry)) {
  Object.assign(debugRequestHeaders, cdn.requestHeaders ?? {});
}

function evalRule(rule, headers) {
  const val = headers[rule.header.toLowerCase()];
  switch (rule.type) {
    case 'header_exists':   return !!val;
    case 'header_key_set':  return rule.header.toLowerCase() in headers;
    case 'header_matches':  return !!val && new RegExp(rule.pattern).test(val);
    case 'header_contains': return (val || '').toLowerCase().includes(rule.value.toLowerCase());
    default: return false;
  }
}

function normalizeCacheStatus(raw, cdnEntry) {
  console.log('Normalizing cache status:', { raw, cdn: cdnEntry?.name });
  if (!raw || !cdnEntry?.statusNormalization) return raw;
  for (const rule of cdnEntry.statusNormalization) {
    if (raw.includes(rule.contains)) {
      console.log('Found matching rule:', { contains: rule.contains, normalized: rule.normalized });
      return rule.normalized;
    }
  }
  console.log('No matching rule found for cache status:', { raw, cdn: cdnEntry?.name });
  return raw;
}

function detectTimings(headers, cdnEntry) {
  const cacheStatusCheck = cdnEntry?.cacheStatusCheck?? {};
  const timer = cacheStatusCheck.timer ? (headers[cacheStatusCheck.timer] ?? null) : null;
  const age   = headers['age'] ?? null;
  return { timer, age };
}

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  try {
    const request = event.request;
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Only allow GET requests
    if (method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          'Content-Type': 'text/plain',
          'Allow': 'GET'
        }
      });
    }

    // Serve HTML pages
    if (path === '/' || path === '') {
      return new Response(htmlPage, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (path === '/styles.css') {
      return new Response(cssStyles, {
        status: 200,
        headers: { 'Content-Type': 'text/css; charset=utf-8' }
      });
    }

    // Fetch response headers for a given URL via HEAD request
    if (path === '/fetch-headers') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid URL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const backend = new Backend({
        name: parsedUrl.hostname,
        target: parsedUrl.hostname,
        useSSL: parsedUrl.protocol === 'https:',
        hostOverride: parsedUrl.hostname,
        connectTimeout: 5000,
        firstByteTimeout: 10000,
        betweenBytesTimeout: 10000,
      });

      console.log(debugRequestHeaders);

      const headResponse = await fetch(targetUrl, {
        method: 'HEAD',
        backend,
        headers: debugRequestHeaders,
      });

      const headers = {};
      for (const [key, value] of headResponse.headers) {
        headers[key.toLowerCase()] = value;
      }

      const cdn = new CDN();
      cdnEntry = cdn.detectCDN(headers);

//      const { status: cacheStatus, hits: cacheHits } = cdn.detectCacheStatus(headers, cdnEntry);
      const cacheStatus = cdn.detectCacheStatus(headers, cdnEntry)?.status ?? null;
      const cacheHits = cdn.detectCacheHits                     (headers, cdnEntry)?.hits ?? null;
      const timings = detectTimings(headers, cdnEntry);

      return new Response(JSON.stringify({ headers, status: headResponse.status, cdn, cacheStatus, cacheHits, timings }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return 404 for all other paths
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error('Error handling request:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
