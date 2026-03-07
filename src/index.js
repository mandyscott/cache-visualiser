/// <reference types="@fastly/js-compute" />
import { includeBytes } from "fastly:experimental";
import { Backend } from "fastly:backend";
import { CDN } from './cdn.mjs';

const htmlPage = includeBytes("./src/index.html");
const cssStyles = includeBytes("./src/styles.css");

// Parse the CDN registry to the WASM binary
const registry = JSON.parse(new TextDecoder().decode(includeBytes("./data/cdns.json")));

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

      /* BEGIN CDN detection */
      const cdn = new CDN(registry);
      const headResponse = await fetch(targetUrl, {
        method: 'HEAD',
        backend,
        headers: cdn.debugRequestHeaders,
      });

      const headers = {};
      for (const [key, value] of headResponse.headers) {
        headers[key.toLowerCase()] = value;
      }

      cdn.detectCDN(headers);
      const cacheStatus = cdn.detectCacheStatus()?.cacheStatus ?? null;
      const cacheHits = cdn.detectCacheHits()?.hits ?? null;
      const timings = {}; // cdn.detectTimings();
      /* END CDN detection */


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
