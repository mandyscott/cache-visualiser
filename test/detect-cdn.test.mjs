import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const registry = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../data/cdns.json'), 'utf8')
);

// Mirror of the driver in src/index.js — keep in sync if the function changes.
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

function detectCDN(headers) {
    for (const [, cdn] of Object.entries(registry)) {
        if ((cdn.detection || []).some(rule => evalRule(rule, headers)))
            return { name: cdn.name, cssClass: cdn.cssClass };
    }
    return { name: 'Unknown', cssClass: 'cdn-unknown' };
}

function normalizeCacheStatus(raw, cdnEntry) {
    if (!raw || !cdnEntry?.statusNormalization) return raw;
    for (const rule of cdnEntry.statusNormalization) {
        if (raw.includes(rule.contains)) return rule.normalized;
    }
    return raw;
}

function detectCacheStatus(headers, cdnEntry) {
    const map = cdnEntry?.cacheHeaders ?? {};
    const status = normalizeCacheStatus(
        map.status ? (headers[map.status] ?? null) : null,
        cdnEntry
    );
    const hits = map.hits ? (headers[map.hits] ?? null) : null;
    return { status, hits };
}

function detectTimings(headers, cdnEntry) {
    const map = cdnEntry?.cacheHeaders ?? {};
    const timer = map.timer ? (headers[map.timer] ?? null) : null;
    const age   = headers['age'] ?? null;
    return { timer, age };
}

// Helper: look up a registry entry by CDN name
function entryFor(name) {
    return Object.values(registry).find(c => c.name === name);
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

test('Akamai detected via akamai-grn', () => {
    const result = detectCDN({ 'akamai-grn': '0a1b2c3d' });
    assert.equal(result.name, 'Akamai');
});

test('Akamai detected via x-cache-status TCP_ prefix', () => {
    const result = detectCDN({ 'x-cache-status': 'TCP_MISS from a23-203-53-33.deploy.akamaitechnologies.com (AkamaiGHost/22.4.3-90cfec5b1d9fb5e086ffb86de3f67006) (-)' });
    assert.equal(result.name, 'Akamai');
});

test('Akamai detected via x-cache-status TCP_HIT', () => {
    const result = detectCDN({ 'x-cache-status': 'TCP_HIT from a23-45-67-89.deploy.akamaitechnologies.com (AkamaiGHost)' });
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

// ─── detectCacheStatus ────────────────────────────────────────────────────────

test('Fastly: status HIT and hits count resolved', () => {
    const headers = { 'x-cache': 'HIT, HIT', 'x-cache-hits': '3, 1' };
    const { status, hits } = detectCacheStatus(headers, entryFor('Fastly'));
    assert.equal(status, 'HIT, HIT');
    assert.equal(hits, '3, 1');
});

test('Fastly: status MISS resolved', () => {
    const headers = { 'x-cache': 'MISS', 'x-cache-hits': '0' };
    const { status, hits } = detectCacheStatus(headers, entryFor('Fastly'));
    assert.equal(status, 'MISS');
    assert.equal(hits, '0');
});

test('Cloudflare: cf-cache-status resolved', () => {
    const headers = { 'cf-cache-status': 'HIT', 'cf-ray': '7a1b2c3d4e5f-LHR' };
    const { status, hits } = detectCacheStatus(headers, entryFor('Cloudflare'));
    assert.equal(status, 'HIT');
    assert.equal(hits, null);
});

test('Akamai: TCP_HIT normalized to HIT', () => {
    const headers = { 'x-cache-status': 'TCP_HIT from a23-45-67-89.deploy.akamaitechnologies.com (AkamaiGHost)' };
    const { status } = detectCacheStatus(headers, entryFor('Akamai'));
    assert.equal(status, 'HIT');
});

test('Akamai: TCP_MISS normalized to MISS', () => {
    const headers = { 'x-cache-status': 'TCP_MISS from a23-203-53-33.deploy.akamaitechnologies.com (AkamaiGHost/22.4.3-90cfec5b1d9fb5e086ffb86de3f67006) (-)' };
    const { status } = detectCacheStatus(headers, entryFor('Akamai'));
    assert.equal(status, 'MISS');
});

test('Akamai: RefreshHit normalized to HIT', () => {
    const { status } = detectCacheStatus({ 'x-cache-status': 'RefreshHit' }, entryFor('Akamai'));
    assert.equal(status, 'HIT');
});

test('Akamai: NotCacheable normalized to PASS', () => {
    const { status } = detectCacheStatus({ 'x-cache-status': 'NotCacheable' }, entryFor('Akamai'));
    assert.equal(status, 'PASS');
});

test('Vercel: x-vercel-cache resolved', () => {
    const { status } = detectCacheStatus({ 'x-vercel-cache': 'STALE' }, entryFor('Vercel'));
    assert.equal(status, 'STALE');
});

test('Unknown CDN: status and hits are null', () => {
    const { status, hits } = detectCacheStatus({ 'content-type': 'text/html' }, undefined);
    assert.equal(status, null);
    assert.equal(hits, null);
});

// ─── detectTimings ────────────────────────────────────────────────────────────

test('Fastly: x-timer extracted', () => {
    const headers = { 'x-timer': 'S1766557562.572454,VS0,VE44' };
    const { timer, age } = detectTimings(headers, entryFor('Fastly'));
    assert.equal(timer, 'S1766557562.572454,VS0,VE44');
    assert.equal(age, null);
});

test('age header returned when present', () => {
    const headers = { 'x-cache': 'HIT', 'age': '3600' };
    const { age } = detectTimings(headers, entryFor('Fastly'));
    assert.equal(age, '3600');
});

test('CDN without timer mapping returns null timer', () => {
    const headers = { 'cf-cache-status': 'HIT', 'age': '120' };
    const { timer, age } = detectTimings(headers, entryFor('Cloudflare'));
    assert.equal(timer, null);
    assert.equal(age, '120');
});

test('No headers: timer and age are null', () => {
    const { timer, age } = detectTimings({}, entryFor('Fastly'));
    assert.equal(timer, null);
    assert.equal(age, null);
});
