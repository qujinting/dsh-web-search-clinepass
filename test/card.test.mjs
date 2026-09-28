/**
 * Browser-half tests: load the hand-written client bundle exactly the way the
 * module loader does, then assert the slot registration, the write planner, and
 * (when react-dom is available) a static render of the card.
 *
 * React is resolved from the Harness web profile: the client baseline module
 * table is seeded by the shell, so this repository never depends on it. The
 * registration and planner tests need no real React at all - the module body
 * only touches React when it renders - so they run anywhere.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');

/** Bumped per load so each evaluation gets its own module URL. */
let loadCount = 0;

/**
 * Resolve one bare module from the first anchor that can answer.
 * @param specifier - the bare module to resolve.
 * @returns the module, or undefined when no anchor can answer.
 */
function resolveFromHarness(specifier) {
	const external = process.env.DSH_CARD_TEST_MODULES;
	const anchors = [
		// DSH_CARD_TEST_MODULES lets a developer point these tests at any module
		// directory that carries react plus react-dom (for example a scratch
		// `npm install --prefix <dir> react react-dom`).
		...(typeof external === 'string' && external.length > 0 ? [join(external, 'resolve-from.js')] : []),
		join(dshHome, 'profiles', 'web', 'package.json'),
		join(dshHome, 'profiles', 'package.json'),
		join(process.cwd(), 'package.json'),
	];
	for (const anchor of anchors) {
		try {
			// createRequire only needs a base path, so an anchor need not exist:
			// CJS resolution walks up from it either way.
			return createRequire(anchor)(specifier);
		} catch {
			/* try the next anchor */
		}
	}
	return undefined;
}

const React = resolveFromHarness('react');
const renderToStaticMarkup = resolveFromHarness('react-dom/server')?.renderToStaticMarkup;

/** The baseline module the web shell seeds that the card draws its UI from. */
const PRIMITIVES = '@deepseek-ai/dsh-client-ui-primitives';

/**
 * Stand in for the baseline primitives module. The shell always seeds the real
 * one; a stub keeps these tests hermetic (a browser-only React component tree
 * cannot be imported into Node) while still proving the card asks that module
 * for the parts it renders.
 * @param react - the module to build the stub components from.
 * @returns the stub exports.
 */
function primitivesStub(react) {
	if (react === undefined) return {};
	const el = react.createElement;
	return {
		Tag: (props) => el('span', { 'data-test-tag': props.tone ?? '', className: props.className }, props.children),
		IconChevronDownOutline14: (props) => el('svg', { 'data-test-chevron': '', viewBox: '0 0 16 16', className: props.className }),
		Switch: (props) => el('button', {
			type: 'button',
			role: 'switch',
			'aria-checked': props.checked === true,
			disabled: props.disabled,
			className: props.className,
			onClick: () => props.onChange(props.checked !== true),
		}, props.label),
	};
}

/**
 * Load the bundle through the loader format it ships in.
 * @param react - the module the bundle's `require('react')` answers with.
 */
async function loadClientBundle(react) {
	const source = readFileSync(join(process.cwd(), 'lib', 'client.js'), 'utf8');
	let entry;
	const previous = globalThis.window;
	globalThis.window = { __ModuleLoader__: { load(registration) { entry = registration; } } };
	try {
		const dataUrl = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64') + '#load' + String((loadCount += 1));
		await import(dataUrl);
	} finally {
		if (previous === undefined) delete globalThis.window;
		else globalThis.window = previous;
	}
	assert.ok(entry, 'the bundle must register one module');
	assert.equal(entry.id, 'dsh-web-search-clinepass');
	const required = [];
	const exports = entry.factory((specifier) => {
		required.push(specifier);
		if (specifier === 'react') return react;
		if (specifier === PRIMITIVES) return primitivesStub(react);
		throw new Error('unexpected require: ' + specifier);
	});
	exports.__required = required;
	return exports;
}

function fakeScope(options = {}) {
	const snapshot = {
		status: options.status ?? 'ready',
		value: options.section ?? {},
		base: {},
		user: options.user ?? {},
		revision: options.revision ?? 7,
		writable: true,
		mode: 'host',
	};
	const writes = [];
	return {
		writes,
		snapshot,
		getSnapshot: () => snapshot,
		subscribe: () => () => {},
		mutate: async (ops, expected) => { writes.push({ ops, expected }); },
		set: async () => {},
		unset: async () => {},
	};
}

test('the bundle registers the card under the settings namespace key', async () => {
	const module = await loadClientBundle({});
	assert.equal(typeof module.apply, 'function');
	assert.deepEqual(module.inject, ['slots', 'settingsScope']);
	const bound = [];
	const registered = [];
	let ledgerReads = 0;
	const ctx = {
		settingsScope: { bind: (spec) => { bound.push(spec); return fakeScope(); } },
		slots: {
			// The ledger is empty for the first reads, then carries the deployment's
			// own cards: registration must wait for it, so this card ranks last.
			entries: (name) => {
				assert.equal(name, 'settings.plugin.item');
				ledgerReads += 1;
				return ledgerReads < 3 ? [] : [{ options: { key: 'shell' } }, { options: { key: 'web-search-deepseek' } }];
			},
			register: (entry, component) => {
				registered.push({ entry, component, ledgerReads });
				return () => {};
			},
		},
	};
	await module.apply(ctx);
	assert.deepEqual(bound, [{ namespace: 'web-search-clinepass' }]);
	assert.equal(registered.length, 1);
	assert.equal(registered[0].entry.name, 'settings.plugin.item');
	assert.equal(registered[0].entry.key, 'web-search-clinepass');
	assert.equal(registered[0].entry.inject().scope.snapshot.revision, 7);
	assert.equal(typeof registered[0].component, 'function');
	assert.ok(registered[0].ledgerReads >= 3, 'registration waits for the cards the deployment ships');
});

test('the write planner stores only real changes and clears defaults', async () => {
	const module = await loadClientBundle({});
	const { buildOps, readDraft, clearOps, FIELDS } = module.__internals;
	const defaults = readDraft(undefined);
	assert.equal(defaults.tool, 'vercel:perplexity_search');
	assert.equal(defaults.maxTokens, 4096);
	assert.equal(defaults.enabled, true);
	assert.deepEqual(buildOps(defaults, {}, {}), [], 'an untouched default section writes nothing');
	const changed = Object.assign({}, defaults, { tool: 'vercel:parallel_search', maxSources: 4 });
	assert.deepEqual(buildOps(changed, { tool: 'vercel:perplexity_search' }, {}), [
		{ op: 'set', path: ['tool'], value: 'vercel:parallel_search' },
		{ op: 'set', path: ['maxSources'], value: 4 },
	]);
	assert.deepEqual(buildOps(defaults, { tool: 'vercel:exa_search' }, { tool: 'vercel:exa_search' }), [
		{ op: 'unset', path: ['tool'] },
	], 'returning a field to its default clears the override');
	assert.deepEqual(clearOps({ maxSources: 4, enabled: false }), [
		{ op: 'unset', path: ['enabled'] },
		{ op: 'unset', path: ['maxSources'] },
	]);
	assert.equal(FIELDS.length, 8);
});

test('a section that already matches the defaults writes nothing', async () => {
	const module = await loadClientBundle({});
	const { buildOps, readDraft } = module.__internals;
	const draft = readDraft({ tool: 'vercel:perplexity_search', maxSources: 10, timeoutMs: 90000, maxTokens: 4096, enabled: true });
	assert.deepEqual(buildOps(draft, { tool: 'vercel:perplexity_search' }, {}), []);
});

test('the card renders its controls against a fake scope', async (t) => {
	if (React === undefined || renderToStaticMarkup === undefined) { t.skip('react-dom is not available on this machine'); return; }
	const module = await loadClientBundle(React);
	const scope = fakeScope({ section: { tool: 'vercel:parallel_search' }, user: { tool: 'vercel:parallel_search' } });
	const markup = renderToStaticMarkup(React.createElement(module.__internals.WebSearchClinepassCard, { scope, defaultOpen: true }));
	assert.match(markup, /网页搜索（当前模型）/u);
	assert.match(markup, /web-search-clinepass-tool/u);
	assert.match(markup, /vercel:parallel_search/u);
	assert.match(markup, /vercel:exa_search/u, 'every gateway tool is offered');
});

test('the card starts collapsed and only its header is rendered', async (t) => {
	if (React === undefined || renderToStaticMarkup === undefined) { t.skip('react-dom is not available on this machine'); return; }
	const module = await loadClientBundle(React);
	const scope = fakeScope({ section: { tool: 'vercel:parallel_search' } });
	const markup = renderToStaticMarkup(React.createElement(module.__internals.WebSearchClinepassCard, { scope }));
	assert.match(markup, /<li /u, 'a card is a list item, like the ones the deployment ships');
	assert.match(markup, /aria-expanded="false"/u);
	assert.doesNotMatch(markup, /web-search-clinepass-tool/u, 'the body stays out of the DOM while collapsed');
	assert.match(markup, /网页搜索（当前模型）/u);
	assert.match(markup, /data-test-chevron/u, 'the header carries the chevron the baseline module provides');
});

test('a missing namespace renders the unavailable state instead of crashing', async (t) => {
	if (React === undefined || renderToStaticMarkup === undefined) { t.skip('react-dom is not available on this machine'); return; }
	const module = await loadClientBundle(React);
	const scope = fakeScope({ status: 'unavailable' });
	const markup = renderToStaticMarkup(React.createElement(module.__internals.WebSearchClinepassCard, { scope }));
	assert.match(markup, /本部署不对外暴露/u);
});

test('the card draws its chrome from the deployment instead of inventing one', async () => {
	const module = await loadClientBundle({});
	const { CSS, CSS_ID, C } = module.__internals;
	assert.ok(module.__required.includes(PRIMITIVES), 'the baseline primitives module is what the card styles itself with');
	assert.equal(CSS_ID, 'dsh-web-search-clinepass/card.css');
	assert.ok(CSS.includes('var(--dsw-alias-'), 'the chrome reads deployment theme tokens');
	assert.doesNotMatch(CSS, /#[0-9a-fA-F]{3,8}\b/u, 'no literal colour of its own');
	assert.doesNotMatch(CSS, /rgba?\(/u, 'no literal colour of its own');
	// Every rule is namespaced, so the card cannot leak styles into the page or
	// collide with the shipped card sheets.
	for (const [, selector] of CSS.matchAll(/(?:^|[}])([^@{}]+)[{]/gu)) {
		for (const one of selector.split(',')) {
			assert.ok(one.trim().startsWith('.dswwsc-'), 'rule ' + one.trim() + ' is namespaced to this card');
		}
	}
	assert.equal(C.card, 'dswwsc-card');
});

test('the card renders the baseline Tag, Switch, and chevron it was handed', async (t) => {
	if (React === undefined || renderToStaticMarkup === undefined) { t.skip('react-dom is not available on this machine'); return; }
	const module = await loadClientBundle(React);
	const scope = fakeScope({ section: { tool: 'vercel:parallel_search' } });
	const collapsed = renderToStaticMarkup(React.createElement(module.__internals.WebSearchClinepassCard, { scope }));
	assert.match(collapsed, /data-test-chevron/u, 'the header chevron comes from the baseline module');
	assert.doesNotMatch(collapsed, /data-test-tag/u, 'a clean card holds no unsaved marker');
	const expanded = renderToStaticMarkup(React.createElement(module.__internals.WebSearchClinepassCard, { scope, defaultOpen: true }));
	assert.match(expanded, /role="switch"/u, 'the boolean field is the baseline switch');
	assert.match(expanded, /class="dswwsc-input"/u, 'the other controls carry the card field class');
});
