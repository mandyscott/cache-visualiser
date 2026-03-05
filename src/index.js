/// <reference types="@fastly/js-compute" />
import { includeBytes } from "fastly:experimental";
import { Backend } from "fastly:backend";

const htmlPage = includeBytes("./src/index.html");
const htmlPageLight = includeBytes("./src/index-light.html");

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
  if (!raw || !cdnEntry?.statusNormalization) return raw;
  for (const rule of cdnEntry.statusNormalization) {
    if (raw.includes(rule.contains)) return rule.normalized;
  }
  return raw;
}

function detectCDN(headers) {
  for (const [, cdn] of Object.entries(registry)) {
    if ((cdn.detection || []).some(rule => evalRule(rule, headers)))
      return { name: cdn.name, cssClass: cdn.cssClass };
  }
  return { name: 'Unknown', cssClass: 'cdn-unknown' };
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

    if (path === '/light') {
      return new Response(htmlPageLight, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
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

      const headResponse = await fetch(targetUrl, {
        method: 'HEAD',
        backend,
        headers: debugRequestHeaders,
      });

      const headers = {};
      for (const [key, value] of headResponse.headers) {
        headers[key.toLowerCase()] = value;
      }

      const cdn = detectCDN(headers);

      // Resolve cache status and hits from the CDN's own header names
      const cdnEntry = Object.values(registry).find(c => c.name === cdn.name);
      const cacheHeaderMap = cdnEntry ? cdnEntry.cacheHeaders : {};
      const cacheStatus = normalizeCacheStatus(
        cacheHeaderMap.status ? (headers[cacheHeaderMap.status] ?? null) : null,
        cdnEntry
      );
      const cacheHits   = cacheHeaderMap.hits   ? (headers[cacheHeaderMap.hits]   ?? null) : null;

      return new Response(JSON.stringify({ headers, status: headResponse.status, cdn, cacheStatus, cacheHits }), {
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
