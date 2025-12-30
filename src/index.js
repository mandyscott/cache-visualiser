/// <reference types="@fastly/js-compute" />
import { includeBytes } from "fastly:experimental";

const htmlPage = includeBytes("./src/index.html");

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

    // Only serve HTML page for root path
    if (path === '/' || path === '') {
      return new Response(htmlPage, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
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
    // Log error and return 500 response
    console.error('Error handling request:', error.message);
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}
