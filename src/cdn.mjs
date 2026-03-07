/// <reference types="@fastly/js-compute" />

export class CDN {
  constructor(registry) {
    this.name = '';
    this.cssClass = '';
		// Parse the CDN registry at startup — stays private inside the WASM binary.
		this.registry = registry || {};
		this.debugRequestHeaders = {};
		// Merge all CDN-specific debug request headers so we send them all on every outbound HEAD request (we don't know which CDN we'll hit in advance).
		for (const cdn of Object.values(registry)) {
			Object.assign(this.debugRequestHeaders, cdn.requestHeaders ?? {});
		}
		// There should be just one set of request headers, store it here to avoid passing back and forward.
		this.requestHeaders = {};
  }

	detectCacheHits() {
		const rule = this.cdnEntry?.cacheStatusCheck;
		if (!!rule && this.evalRule(rule)) {
			const hits = rule.hits ? (this.requestHeaders[rule.hits] ?? null) : null;
			return { hits };
		}
		return 0;
	}

	// By this point we have a better idea which CDN we're dealing with, so we can apply any CDN-specific logic to extract cache status and timing info.
	detectCacheStatus() {
		const rule = this.cdnEntry?.cacheStatusCheck;
		if (!!rule && this.evalRule(rule)) {
			const cacheStatus = this.normalizeCacheStatus(this.requestHeaders[rule.header.toLowerCase()] ?? null);
			return { cacheStatus };
		}
		return null;
	}

	// Loop through all the scenarios for each CDN and see if any match the incoming response headers.
	detectCDN(headers) {
		this.requestHeaders = headers; // Update request headers if new ones are provided
		this.name = this.registry.unknown.name;
		this.cssClass = this.registry.unknown.cssClass;
		this.cdnEntry = this.registry.unknown;
		for (const [, cdn] of Object.entries(this.registry)) {
			console.log('Rule: ', cdn.cdnDetection);
			if ((cdn.cdnDetection || []).some(rule => this.evalRule(rule))) {
				this.name = cdn.name;
				this.cssClass = cdn.cssClass;
				this.cdnEntry = this.registry[cdn.name];
				return;
			}
		}
	}

	/*
	detectTimings(headers) {
		const cacheStatusCheck = this.cdnEntry?.cacheStatusCheck;
		const timer = cacheStatusCheck.timer ? (headers[cacheStatusCheck.timer] ?? null) : null;
		const age   = headers['age'] ?? null;
		return { timer, age };
	}
	*/

	display() {
    console.log(`Name: (${this.name} ?? this.registry.unknown.name), cssClass: (${this.cssClass} ?? this.registry.unknown.cssClass)`);
  }

	evalRule(rule) {
		const val = this.requestHeaders[rule.header.toLowerCase()] ?? null;
		console.log(`${rule.header.toLowerCase()}: ${val})`);
		if (!!val) {
			switch (rule.type) {
				case 'header_exists':   return !!val;
				case 'header_key_set':  return rule.header.toLowerCase() in this.requestHeaders;
				case 'header_matches':  return !!val && new RegExp(rule.pattern).test(val);
				case 'header_contains': return (val || '').toLowerCase().includes(rule.value.toLowerCase());
				default: return false;
			}
		} else {
			return false;
		}
	}

	normalizeCacheStatus(raw) {
		console.log('Normalizing cache status:', { raw, cdn: this.name });
		if (!raw || !this.cdnEntry?.statusNormalization) return raw;
		for (const rule of this.cdnEntry.statusNormalization) {
			if (raw.includes(rule.contains)) {
				console.log('Found matching rule:', { contains: rule.contains, normalized: rule.normalized });
				return rule.normalized;
			}
		}
		console.log('No matching rule found for cache status:', { raw, cdn: this.name });
		return raw;
	}
}
