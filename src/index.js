/// <reference types="@fastly/js-compute" />
import { includeBytes } from "fastly:experimental";
import { Backend } from "fastly:backend";

const htmlPage = includeBytes("./src/index.html");
const htmlPageLight = includeBytes("./src/index-light.html");

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
        headers: {
          'Fastly-Debug': '1',
          //                        'User-Agent': 'CacheInspector/1.0',
        }
      });

      const headers = {};
      for (const [key, value] of headResponse.headers) {
        headers[key.toLowerCase()] = value;
      }

      return new Response(JSON.stringify({ headers, status: headResponse.status }), {
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
