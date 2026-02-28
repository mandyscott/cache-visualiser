import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of detectCDN() from src/index.html — keep in sync if the function changes.
function detectCDN(headers) {
    if (
        headers['x-served-by'] ||
        headers['fastly-debug-path'] ||
        headers['x-fastly-request-id'] ||
        headers['x-cache-hits'] !== undefined ||
        (headers['x-timer'] && /^S[\d.]+,VS/.test(headers['x-timer']))
    ) {
        return { name: 'Fastly', cssClass: 'fastly' };
    }

    if (
        headers['cf-ray'] ||
        headers['cf-cache-status'] ||
        (headers['server'] || '').toLowerCase().includes('cloudflare')
    ) {
        return { name: 'Cloudflare', cssClass: 'cloudflare' };
    }

    if (
        headers['x-amz-cf-id'] ||
        (headers['via'] || '').includes('cloudfront.net')
    ) {
        return { name: 'CloudFront', cssClass: 'cloudfront' };
    }

    if (
        headers['Akamai-Grn'] ||
        headers['x-akamai-request-id'] ||
        headers['x-check-cacheable'] ||
        headers['akamai-cache-status'] ||
    ) {
        return { name: 'Akamai', cssClass: 'akamai' };
    }

    if (
        headers['cdn-pullzone'] ||
        headers['cdn-uid'] ||
        headers['cdn-requestid'] ||
        headers['bunnycdn-cache-status']
    ) {
        return { name: 'BunnyCDN', cssClass: 'bunny' };
    }

    if (
        headers['x-vercel-id'] ||
        headers['x-vercel-cache'] ||
        (headers['server'] || '').toLowerCase().includes('vercel')
    ) {
        return { name: 'Vercel', cssClass: 'vercel' };
    }

    if (
        headers['x-varnish'] ||
        (headers['via'] || '').toLowerCase().includes('varnish')
    ) {
        return { name: 'Varnish', cssClass: 'varnish' };
    }

    return { name: 'Unknown', cssClass: 'cdn-unknown' };
}

// ─── Fastly ───────────────────────────────────────────────────────────────────

test('Fastly detected via x-served-by', () => {
    const result = detectCDN({ 'x-served-by': 'cache-sea4469-SEA' });
    assert.equal(result.name, 'Fastly');
    assert.equal(result.cssClass, 'fastly');
});

test('Fastly detected via x-cache-hits (zero count)', () => {
    const result = detectCDN({ 'x-cache-hits': '0' });
    assert.equal(result.name, 'Fastly');
});

test('Fastly detected via x-timer format', () => {
    const result = detectCDN({ 'x-timer': 'S1766557562.572454,VS0,VE44' });
    assert.equal(result.name, 'Fastly');
});

test('Fastly detected via fastly-debug-path', () => {
    const result = detectCDN({ 'fastly-debug-path': '(D cache-lax-01 1234567890.123)' });
    assert.equal(result.name, 'Fastly');
});

test('Fastly detected via x-fastly-request-id', () => {
    const result = detectCDN({ 'x-fastly-request-id': 'abc123' });
    assert.equal(result.name, 'Fastly');
});

// ─── Cloudflare ───────────────────────────────────────────────────────────────

test('Cloudflare detected via cf-ray', () => {
    const result = detectCDN({ 'cf-ray': '7a1b2c3d4e5f-LHR' });
    assert.equal(result.name, 'Cloudflare');
    assert.equal(result.cssClass, 'cloudflare');
});

test('Cloudflare detected via cf-cache-status', () => {
    const result = detectCDN({ 'cf-cache-status': 'HIT' });
    assert.equal(result.name, 'Cloudflare');
});

test('Cloudflare detected via server header', () => {
    const result = detectCDN({ 'server': 'cloudflare' });
    assert.equal(result.name, 'Cloudflare');
});

// ─── CloudFront ───────────────────────────────────────────────────────────────

test('CloudFront detected via x-amz-cf-id', () => {
    const result = detectCDN({ 'x-amz-cf-id': 'abc123==' });
    assert.equal(result.name, 'CloudFront');
    assert.equal(result.cssClass, 'cloudfront');
});

test('CloudFront detected via via header', () => {
    const result = detectCDN({ 'via': '1.1 abc.cloudfront.net (CloudFront)' });
    assert.equal(result.name, 'CloudFront');
});

// ─── Akamai ───────────────────────────────────────────────────────────────────

test('Akamai detected via x-akamai-request-id', () => {
    const result = detectCDN({ 'x-akamai-request-id': 'abc123' });
    assert.equal(result.name, 'Akamai');
    assert.equal(result.cssClass, 'akamai');
});

test('Akamai detected via x-check-cacheable', () => {
    const result = detectCDN({ 'x-check-cacheable': 'YES' });
    assert.equal(result.name, 'Akamai');
});

// ─── BunnyCDN ─────────────────────────────────────────────────────────────────

test('BunnyCDN detected via cdn-pullzone', () => {
    const result = detectCDN({ 'cdn-pullzone': '123456' });
    assert.equal(result.name, 'BunnyCDN');
    assert.equal(result.cssClass, 'bunny');
});

test('BunnyCDN detected via cdn-uid', () => {
    const result = detectCDN({ 'cdn-uid': 'abc-def-ghi' });
    assert.equal(result.name, 'BunnyCDN');
});

// ─── Vercel ───────────────────────────────────────────────────────────────────

test('Vercel detected via x-vercel-id', () => {
    const result = detectCDN({ 'x-vercel-id': 'iad1::abc123' });
    assert.equal(result.name, 'Vercel');
    assert.equal(result.cssClass, 'vercel');
});

test('Vercel detected via x-vercel-cache', () => {
    const result = detectCDN({ 'x-vercel-cache': 'HIT' });
    assert.equal(result.name, 'Vercel');
});

test('Vercel detected via server header', () => {
    const result = detectCDN({ 'server': 'Vercel' });
    assert.equal(result.name, 'Vercel');
});

// ─── Varnish ──────────────────────────────────────────────────────────────────

test('Varnish detected via x-varnish', () => {
    const result = detectCDN({ 'x-varnish': '12345 67890' });
    assert.equal(result.name, 'Varnish');
    assert.equal(result.cssClass, 'varnish');
});

test('Varnish detected via via header', () => {
    const result = detectCDN({ 'via': '1.1 varnish (Varnish/7.0)' });
    assert.equal(result.name, 'Varnish');
});

// ─── Unknown / no CDN ─────────────────────────────────────────────────────────

test('Unknown when no CDN headers present', () => {
    const result = detectCDN({ 'content-type': 'text/html', 'server': 'nginx' });
    assert.equal(result.name, 'Unknown');
    assert.equal(result.cssClass, 'cdn-unknown');
});

test('Unknown for empty headers object', () => {
    const result = detectCDN({});
    assert.equal(result.name, 'Unknown');
});

// ─── Priority (Fastly wins over generic x-varnish) ────────────────────────────

test('Fastly wins over x-varnish when both present', () => {
    const result = detectCDN({ 'x-served-by': 'cache-lax-01', 'x-varnish': '12345' });
    assert.equal(result.name, 'Fastly');
});
