/**
 * Regression test: a search must never append a custom session event.
 *
 * DSH's session read path refuses any event type outside
 * KNOWN_SESSION_EVENT_TYPES that is not marked `ignorable: true`, and an
 * out-of-repo plugin cannot set that marker through Session.append(). Writing
 * one therefore makes the whole session unloadable on its next resume; this
 * test pins the search path to a pure seam read that writes nothing durable.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CurrentModelSearchProvider } from '../src/provider.js';

const ANSWER = [
	'济南到扬州的高铁二等座票价约 300 元。',
	'',
	'Sources:',
	'- [12306](https://www.12306.cn/)',
	'- [携程](https://www.ctrip.com/)',
].join('\n');

function ctxWith(agent) {
	return {
		get(name) {
			return name === 'agents' ? { currentInitiator: () => agent } : undefined;
		},
	};
}

function gatewayResponse() {
	return new Response(JSON.stringify({
		choices: [{
			message: {
				content: ANSWER,
				provider_metadata: { gateway: { gatewayToolCalls: { perplexity_search: 2 }, gatewayCost: '0.0112', generationId: 'gen_test' } },
			},
			finish_reason: 'stop',
		}],
	}), { status: 200, headers: { 'content-type': 'application/json' } });
}

const CONFIG = {
	provider: 'clinepass',
	model: 'cline-pass/deepseek-v4.1-flash',
	baseURL: 'https://api.cline.bot/api/v1',
	api: 'openai-completions',
	apiKey: 'test-key',
	tool: 'vercel:perplexity_search',
	maxSources: 5,
};

test('a search returns sources and appends no session event', async () => {
	const appends = [];
	const session = {
		append(type, data) { appends.push({ type, data }); },
		requestHeader: () => ({ config: { provider: 'clinepass', model: 'cline-pass/deepseek-v4.1-flash' } }),
	};
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => gatewayResponse();
	try {
		const provider = new CurrentModelSearchProvider(ctxWith({ session }), () => CONFIG);
		const result = await provider.search({ query: '扬州东站 到 济南西 高铁 二等座票价', maxResults: 5 });
		assert.deepEqual(appends, []);
		assert.deepEqual(result.sources, [
			{ url: 'https://www.12306.cn/', title: '12306' },
			{ url: 'https://www.ctrip.com/', title: '携程' },
		]);
		assert.equal(result.truncated, false);
		assert.match(result.content, /济南到扬州的高铁二等座票价/u);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('an unresolvable route fails without touching the session', async () => {
	const appends = [];
	const provider = new CurrentModelSearchProvider(ctxWith({ session: { append: () => appends.push(1) } }), () => ({ enabled: true }));
	assert.equal(provider.available(), false);
	await assert.rejects(() => provider.search({ query: 'anything' }), /cannot resolve a serviceable route/u);
	assert.deepEqual(appends, []);
});

test('the settings section no longer advertises a session-log write', async () => {
	const { Config } = await import('../src/config.js');
	const resolved = new Config({});
	assert.equal(Object.hasOwn(resolved, 'recordRequests'), false);
});
