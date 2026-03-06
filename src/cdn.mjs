/// <reference types="@fastly/js-compute" />

export class CDN {
  constructor(registry) {
    this.name = '';
    this.cssClass = '';
		// Parse the CDN registry at startup — stays private inside the WASM binary.
		this.registry = registry || {};
		// There should be just one set of headers, store it here to avoid passing back and forward.
		this.headers = {};
  }

	detectCacheHits(cdnName) {
		const cdnEntry = this.registry[cdnName];
		const cacheStatusCheck = cdnEntry?.cacheStatusCheck ?? {};

		if (this.evalRule(cacheStatusCheck, this.headers)) {
			const hits = cacheStatusCheck.hits ? (this.headers[cacheStatusCheck.hits] ?? null) : null;
			return { status, hits };
		}
		return { status, hits };
	}

	// By this point we have a better idea which CDN we're dealing with, so we can apply any CDN-specific logic to extract cache status and timing info.
	detectCacheStatus(cdnName) {
		const cdnEntry = this.registry[cdnName];
		const cacheStatusCheck = cdnEntry?.cacheStatusCheck ?? {};

		if (this.evalRule(cacheStatusCheck, this.headers)) {
			const status = normalizeCacheStatus(this.headers[cacheStatusCheck.header.toLowerCase()] ?? null, cdnEntry);
			return { status, hits };
		}
		return { status, hits };
	}

	// Loop through all the scenarios for each CDN and see if any match the incoming response headers.
	detectCDN(headers) {
		this.headers = headers; // Store the headers for later use in cache status/hits detection.
		for (const [, cdn] of Object.entries(this.registry)) {
			if ((cdn.cdnDetection || []).some(rule => this.evalRule(rule, headers)))
				return this.registry[cdn.name];
		}
		return this.registry.unknown;
	}

	display() {
    console.log(`Name: ${this.name}, cssClass: ${this.cssClass}`);
  }

	evalRule(rule) {
		const val = this.headers[rule.header.toLowerCase()];
		switch (rule.type) {
			case 'header_exists':   return !!val;
			case 'header_key_set':  return rule.header.toLowerCase() in this.headers;
			case 'header_matches':  return !!val && new RegExp(rule.pattern).test(val);
			case 'header_contains': return (val || '').toLowerCase().includes(rule.value.toLowerCase());
			default: return false;
		}
	}
}