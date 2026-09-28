/**
 * dsh-web-search-clinepass - browser half.
 *
 * The Host half registers the web-search-clinepass settings namespace; this
 * half registers the card that edits it, under the settings.plugin.item slot
 * keyed by that same namespace. The plugins settings page pairs the two by key
 * (the client bundle purity rule forbids cross-plugin value imports), so the
 * card reaches the outside world only through cordis services -
 * ctx.settingsScope for the section, ctx.slots for the registration - plus the
 * modules the shell seeds into its baseline module table.
 *
 * The card does not invent a look; it uses the deployment's own.
 *
 * There is no declarative card contract to opt into: the slot documentation is
 * explicit that a card draws its own internals and the tab only decides which
 * namespaces to dispatch and stacks what comes back, and the chrome the
 * built-in cards share (PluginCard plus the card-form field kit) is internal to
 * @deepseek-ai/dsh-client-ui-settings-plugins - its client bundle exports only
 * apply and inject, so no other package can import it. What IS shared is the
 * baseline module table the web shell builds (PLATFORM_MODULES): react, cordis,
 * the client store, the slots service, the dock kit, and
 * @deepseek-ai/dsh-client-ui-primitives. This bundle requires primitives from
 * that table - the same instance the built-in cards render - for the two parts
 * that carry behaviour (the unsaved Tag and the header chevron), and writes the
 * remaining chrome from the deployment's own theme tokens (--dsw-alias-*),
 * following the shipped card and field rules one for one.
 *
 * The card keeps the shape those cards use: an li whose header button collapses
 * the body, collapsed by default, collapsing again after a successful save and
 * staying open when one fails. Registration joins the card ledger only once the
 * cards already there have registered, so this one stacks after them rather
 * than above them; it is not pinned to the very end, and a card another plugin
 * registers later still follows it.
 *
 * The bundle is written by hand in the loader format every plugin bundle uses
 * (window.__ModuleLoader__.load({ id, factory })): running it only registers the
 * factory, and the module body materializes on first use.
 */
window.__ModuleLoader__.load({
	id: 'dsh-web-search-clinepass',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const React = require('react');
		// The shell's baseline module table seeds this package, so this resolves to
		// the very instance the built-in settings cards render with.
		const primitives = require('@deepseek-ai/dsh-client-ui-primitives');

		/** Settings namespace this card edits; must equal the Host plugin's. */
		const NAMESPACE = 'web-search-clinepass';
		/** Card title and summary: a card owns its own chrome, so the copy lives here. */
		const TITLE = '网页搜索（当前模型）';
		const DESCRIPTION = '用当前会话选中的模型调用网关自带搜索工具联网检索。';
		/** Field id prefix: stable, so a label can point at its own control. */
		const ID_PREFIX = 'web-search-clinepass-';

		/** Provider-executed search tools a Vercel AI Gateway accepts as one tools[] entry. */
		const TOOLS = [
			'vercel:perplexity_search',
			'vercel:exa_search',
			'vercel:parallel_search',
			'vercel:tako_search',
			'vercel:browserbase_search',
			'vercel:browserbase_fetch',
		];

		/**
		 * The fields this card owns. Every default mirrors the Host schema, so a
		 * draft equal to its default clears the field (inherits) instead of storing
		 * a redundant override.
		 */
		const FIELDS = [
			{ key: 'enabled', kind: 'boolean', label: '启用本 provider', hint: '关掉后本 provider 报告为不可用，web_search 会报 "registered but unavailable"。', def: true },
			{ key: 'tool', kind: 'select', label: '搜索工具', hint: '网关自带的供应商端搜索工具；改它直接改变单次搜索费用（parallel 最便宜）。', def: 'vercel:perplexity_search', options: TOOLS },
			{ key: 'maxSources', kind: 'number', label: '来源上限', hint: '返回给 web 能力的来源条数上限；dsh-tool-web 的 searchMaxResults 还会再截一次。', def: 10 },
			{ key: 'timeoutMs', kind: 'number', label: '超时（毫秒）', hint: '单次搜索超时；dsh-tool-web 自己的 searchTimeoutMs（base 里是 60000）是模型侧的实际外框。', def: 90000 },
			{ key: 'maxTokens', kind: 'number', label: '输出上限（tokens）', hint: '太小会把回答和来源列表一起截断。', def: 4096 },
			{ key: 'provider', kind: 'text', label: '钉死 LLM 路由（可选）', hint: '留空 = 跟随当前会话模型。', def: '' },
			{ key: 'model', kind: 'text', label: '钉死模型（可选）', hint: '留空 = 跟随当前会话模型。', def: '' },
			{ key: 'instructions', kind: 'textarea', label: '追加指令（可选）', hint: '追加到搜索指令末尾。', def: '' },
		];
		/**
		 * The card's own stylesheet, injected the way the shipped bundles inject
		 * theirs (one style element keyed by data-plugin-css). Every value either
		 * reads a deployment theme token or repeats a geometry the shipped card and
		 * field sheets already use - card radius 16px, header 14px/16px, body and
		 * footer divided by a .5px border-l2 rule, control height 34px - so the card
		 * follows the deployment through light, dark, and any future retheme instead
		 * of carrying a palette of its own.
		 */
		const CSS_ID = 'dsh-web-search-clinepass/card.css';
		const CSS = [
			'.dswwsc-card{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;list-style:none;transition:border-color .16s,background .16s}',
			'.dswwsc-card:hover{border-color:var(--dsw-alias-label-dimmed)}',
			'.dswwsc-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}',
			'.dswwsc-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}',
			'.dswwsc-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
			'.dswwsc-headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}',
			'.dswwsc-name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}',
			'.dswwsc-description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}',
			'.dswwsc-chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}',
			'.dswwsc-chevronOpen{transform:rotate(180deg)}',
			'.dswwsc-pending{flex:none}',
			'.dswwsc-body{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}',
			'.dswwsc-readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}',
			'.dswwsc-field{flex-direction:column;gap:6px;padding:12px 0;display:flex}',
			'.dswwsc-field+.dswwsc-field{border-top:.5px solid var(--dsw-alias-border-l2)}',
			'.dswwsc-head{align-items:center;gap:8px;display:flex}',
			'.dswwsc-label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}',
			'.dswwsc-badges{align-items:center;gap:8px;display:inline-flex}',
			'.dswwsc-reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}',
			'.dswwsc-reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}',
			'.dswwsc-reset:disabled{cursor:default}',
			'.dswwsc-input{box-sizing:content-box;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}',
			'.dswwsc-input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}',
			'.dswwsc-input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}',
			'.dswwsc-textarea{height:auto;min-height:66px;padding:8px 12px;resize:vertical}',
			'.dswwsc-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}',
			'.dswwsc-footer{border-top:.5px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}',
			'.dswwsc-failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}',
			'.dswwsc-status{min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;margin:0;font-size:12px;line-height:1.5}',
			'.dswwsc-discard,.dswwsc-save{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}',
			'.dswwsc-discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}',
			'.dswwsc-discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}',
			'.dswwsc-save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}',
			'.dswwsc-discard:disabled,.dswwsc-save:disabled{opacity:.4;cursor:default}',
			'.dswwsc-discard:focus-visible,.dswwsc-save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
		].join('');
		if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']') === null) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-web-search-clinepass';
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/** Class names the stylesheet above defines. */
		const C = {
			card: 'dswwsc-card',
			cardOpen: 'dswwsc-cardOpen',
			header: 'dswwsc-header',
			headText: 'dswwsc-headText',
			name: 'dswwsc-name',
			description: 'dswwsc-description',
			pending: 'dswwsc-pending',
			chevron: 'dswwsc-chevron',
			chevronOpen: 'dswwsc-chevronOpen',
			body: 'dswwsc-body',
			readOnly: 'dswwsc-readOnly',
			field: 'dswwsc-field',
			head: 'dswwsc-head',
			label: 'dswwsc-label',
			badges: 'dswwsc-badges',
			reset: 'dswwsc-reset',
			input: 'dswwsc-input',
			textarea: 'dswwsc-textarea',
			hint: 'dswwsc-hint',
			footer: 'dswwsc-footer',
			failed: 'dswwsc-failed',
			status: 'dswwsc-status',
			discard: 'dswwsc-discard',
			save: 'dswwsc-save',
		};
		/** Join the class names that apply, the way the shipped cards do. */
		function cx() {
			const names = [];
			for (let index = 0; index < arguments.length; index += 1) {
				const name = arguments[index];
				if (name) names.push(name);
			}
			return names.join(' ');
		}

		/** Loose scalar equality, so a number typed into a text box still matches. */
		function sameValue(left, right) {
			if (left === right) return true;
			if (typeof left === 'number' || typeof right === 'number') return Number(left) === Number(right);
			return String(left) === String(right);
		}

		/** Project one resolved section onto the card's draft shape. */
		function readDraft(section) {
			const source = section !== null && typeof section === 'object' ? section : {};
			const draft = {};
			for (const field of FIELDS) {
				const raw = source[field.key];
				if (raw === undefined || raw === null) { draft[field.key] = field.def; continue; }
				if (field.kind === 'number') draft[field.key] = Number.isFinite(Number(raw)) ? Number(raw) : field.def;
				else if (field.kind === 'boolean') draft[field.key] = raw === true;
				else draft[field.key] = String(raw);
			}
			return draft;
		}

		/**
		 * Turn one draft into path ops that store only real changes and clear every
		 * field returned to its default.
		 * @param draft - the staged values.
		 * @param section - the Host-resolved section this draft was seeded from.
		 * @param user - the raw user layer; presence marks a field overridden.
		 * @returns the ordered ops for one atomic mutation.
		 */
		function buildOps(draft, section, user) {
			const resolved = section !== null && typeof section === 'object' ? section : {};
			const overridden = user !== null && typeof user === 'object' ? user : {};
			const ops = [];
			for (const field of FIELDS) {
				const value = draft[field.key];
				const isOverridden = Object.prototype.hasOwnProperty.call(overridden, field.key);
				if (sameValue(value, field.def)) {
					if (isOverridden) ops.push({ op: 'unset', path: [field.key] });
					continue;
				}
				if (!sameValue(value, resolved[field.key])) ops.push({ op: 'set', path: [field.key], value });
			}
			return ops;
		}

		/** Ops that clear every field this card owns. */
		function clearOps(user) {
			const overridden = user !== null && typeof user === 'object' ? user : {};
			return FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(overridden, field.key)).map((field) => ({ op: 'unset', path: [field.key] }));
		}

		/**
		 * One labelled control, laid out like the shipped cards' field kit: label
		 * and badges on one row, the control under them, the hint under that, and a
		 * hairline between consecutive fields.
		 * @param field - the field's spec.
		 * @param draft - the staged value to show.
		 * @param overridden - whether the user layer carries this field.
		 * @param disabled - whether writing is currently refused.
		 * @param onEdit - stage one typed value.
		 * @param onReset - clear this field back to the composition layer.
		 * @returns the field's element.
		 */
		function renderField(field, draft, overridden, disabled, onEdit, onReset) {
			const id = ID_PREFIX + field.key;
			const value = draft[field.key];
			let control;
			if (field.kind === 'boolean') {
				// The deployment's own switch, the control the shipped cards use for
				// booleans; its label prop is what names it to assistive tech.
				control = React.createElement(primitives.Switch, {
					checked: value === true,
					label: field.label,
					disabled,
					onChange: (next) => onEdit(field, next),
				});
			} else if (field.kind === 'select') {
				control = React.createElement('select', { id, className: C.input, value, disabled, onChange: (event) => onEdit(field, event.target.value) },
					field.options.map((option) => React.createElement('option', { key: option, value: option }, option)));
			} else if (field.kind === 'textarea') {
				control = React.createElement('textarea', { id, className: cx(C.input, C.textarea), value, disabled, onChange: (event) => onEdit(field, event.target.value) });
			} else {
				control = React.createElement('input', { id, className: C.input, type: field.kind === 'number' ? 'number' : 'text', value, disabled, onChange: (event) => onEdit(field, event.target.value) });
			}
			return React.createElement('div', { className: C.field, key: field.key },
				React.createElement('div', { className: C.head },
					field.kind === 'boolean'
						? React.createElement('span', { className: C.label }, field.label)
						: React.createElement('label', { className: C.label, htmlFor: id }, field.label),
					overridden ? React.createElement('span', { className: C.badges },
						React.createElement(primitives.Tag, { tone: 'neutral' }, '已覆盖'),
						React.createElement('button', { type: 'button', className: C.reset, disabled, onClick: () => onReset(field) }, '恢复默认')) : null),
				control,
				React.createElement('p', { className: C.hint }, field.hint));
		}
		/**
		 * The header button: title, summary, an unsaved marker, and the chevron -
		 * the deployment's own Tag and chevron glyph, as the shipped cards use them.
		 * @param open - whether the body is showing.
		 * @param unsaved - whether the card holds edits a save would write.
		 * @param onToggle - flip the body.
		 * @returns the header element.
		 */
		function renderHeader(open, unsaved, onToggle) {
			return React.createElement('button', {
				type: 'button',
				className: C.header,
				'aria-expanded': open,
				'aria-label': (open ? '收起: ' : '展开: ') + TITLE,
				onClick: onToggle,
			},
				React.createElement('span', { className: C.headText },
					React.createElement('span', { className: C.name }, TITLE),
					React.createElement('span', { className: C.description }, DESCRIPTION)),
				unsaved ? React.createElement(primitives.Tag, { tone: 'neutral', className: C.pending }, '未保存') : null,
				React.createElement(primitives.IconChevronDownOutline14, { className: cx(C.chevron, open && C.chevronOpen) }));
		}

		/**
		 * The card: the same collapsed-header shape the deployment's own cards use,
		 * with this provider's controls in the body and no credential field - the key
		 * comes from the selected model's own route, so there is nothing to store.
		 * @param props - the bound settings scope and an optional defaultOpen.
		 * @returns the card.
		 */
		function WebSearchClinepassCard(props) {
			const scope = props.scope;
			const subscribe = React.useCallback((listener) => scope.subscribe(listener), [scope]);
			const getSnapshot = React.useCallback(() => scope.getSnapshot(), [scope]);
			const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const section = snapshot.status === 'ready' && snapshot.value !== null && typeof snapshot.value === 'object' ? snapshot.value : {};
			const user = snapshot.user !== null && typeof snapshot.user === 'object' ? snapshot.user : {};
			const [open, setOpen] = React.useState(props.defaultOpen === true);
			const [draft, setDraft] = React.useState(() => readDraft(section));
			const [status, setStatus] = React.useState(null);
			const [busy, setBusy] = React.useState(false);
			const draftRef = React.useRef(draft);
			const seedRef = React.useRef(JSON.stringify(readDraft(section)));
			const saveStartedRef = React.useRef(false);
			draftRef.current = draft;
			React.useEffect(() => {
				if (JSON.stringify(draftRef.current) !== seedRef.current) return;
				const next = readDraft(section);
				setDraft(next);
				seedRef.current = JSON.stringify(next);
			}, [section]);
			React.useEffect(() => {
				if (busy) { saveStartedRef.current = true; return; }
				if (!saveStartedRef.current) return;
				saveStartedRef.current = false;
				if (status !== null && status.kind === 'error') return;
				setOpen(false);
			}, [busy, status]);
			const dirty = JSON.stringify(draft) !== seedRef.current;
			const failed = status !== null && status.kind === 'error';
			const disabled = busy || snapshot.writable === false;
			const edit = (field, value) => {
				setStatus(null);
				setDraft((previous) => Object.assign({}, previous, { [field.key]: field.kind === 'boolean' ? value === true : value }));
			};
			const run = async (ops) => {
				if (ops.length === 0) { setStatus({ kind: 'info', text: '没有需要写入的变更。' }); return; }
				setBusy(true);
				setStatus(null);
				try {
					await scope.mutate(ops, snapshot.revision);
					setStatus({ kind: 'ok', text: '已保存（' + ops.length + ' 项）。' });
				} catch (error) {
					setStatus({ kind: 'error', text: '保存失败：' + (error && error.message ? error.message : String(error)) });
				} finally {
					setBusy(false);
				}
			};
			const save = () => run(buildOps(draft, section, user));
			const clearAll = () => run(clearOps(user));
			const discard = () => { setDraft(readDraft(section)); setStatus(null); };
			const editField = (field, value) => {
				if (field.kind === 'number') { const parsed = Number(value); edit(field, value === '' || !Number.isFinite(parsed) ? '' : parsed); return; }
				edit(field, value);
			};
			const resetField = (field) => run([{ op: 'unset', path: [field.key] }]);
			const statusText = snapshot.status === 'ready'
				? (failed ? status.text : (busy ? '保存中…' : (status === null ? '' : status.text)))
				: '';
			const header = renderHeader(open, dirty || failed, () => setOpen((value) => !value));
			if (snapshot.status !== 'ready') {
				return React.createElement('li', { className: cx(C.card, open && C.cardOpen) }, header,
					React.createElement('div', { className: C.body },
						React.createElement('p', { className: C.readOnly, role: 'status' }, snapshot.status === 'loading' ? '正在读取配置…' : '本部署不对外暴露这个命名空间。')));
			}
			const body = React.createElement('div', { className: C.body },
				snapshot.writable === false ? React.createElement('p', { className: C.readOnly, role: 'status' }, '只读：本部署不允许写这个命名空间。') : null,
				FIELDS.map((field) => renderField(field, draft, Object.prototype.hasOwnProperty.call(user, field.key), disabled, editField, resetField)),
				React.createElement('div', { className: C.footer },
					statusText === '' ? null : React.createElement('p', { className: failed ? C.failed : C.status, role: 'status' }, statusText),
					React.createElement('button', { type: 'button', className: C.discard, disabled, onClick: clearAll }, '全部恢复默认'),
					React.createElement('button', { type: 'button', className: C.discard, disabled: disabled || !dirty, onClick: discard }, '放弃'),
					React.createElement('button', { type: 'button', className: C.save, disabled: disabled || !dirty, onClick: save }, busy ? '保存中…' : '保存')));
			return React.createElement('li', { className: cx(C.card, open && C.cardOpen) }, header, open ? body : null);
		}

		/** Read the card ledger, tolerating a slot that is not declared yet. */
		function cardEntries(ctx) {
			try {
				const entries = ctx.slots.entries('settings.plugin.item');
				return Array.isArray(entries) ? entries : [];
			} catch {
				return [];
			}
		}

		/** Wait one macrotask, the granularity the slot ledger settles on. */
		function nextTick() {
			return new Promise((resolve) => { setTimeout(resolve, 0); });
		}

		/**
		 * Mount the card: bind this namespace's settings scope, then join the card
		 * ledger once the deployment's own cards have landed.
		 *
		 * The tab renders one card per ledger entry, in ledger order, and this
		 * plugin's apply runs before the settings plugin's own cards register, so
		 * registering immediately would put this card on top of every built-in one.
		 * Waiting for a non-empty ledger is what places this card after the cards
		 * that were already there - not fixed at the end, because a card registered
		 * later still follows it. The 2s cap keeps a deployment that ships no cards
		 * of its own from stalling.
		 * @param ctx - the browser plugin context.
		 */
		async function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: NAMESPACE });
			const deadline = Date.now() + 2000;
			while (cardEntries(ctx).length === 0 && Date.now() < deadline) await nextTick();
			ctx.slots.register({
				name: 'settings.plugin.item',
				key: NAMESPACE,
				inject: () => ({ scope }),
			}, WebSearchClinepassCard);
		}

		exports.apply = apply;
		exports.inject = ['slots', 'settingsScope'];
		// Test-only surface: the card's pure helpers and field table, so this repository can unit-test the write planner without a browser.
		exports.__internals = { NAMESPACE, FIELDS, TOOLS, CSS, CSS_ID, C, readDraft, buildOps, clearOps, WebSearchClinepassCard };
		return module.exports;
	},
});
