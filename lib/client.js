/**
 * dsh-web-search-clinepass - browser half.
 *
 * The Host half registers the `web-search-clinepass` settings namespace; this
 * half registers the card that edits it, under the settings.plugin.item slot
 * keyed by that same namespace. The plugins settings page pairs the two by key
 * (`packages/client/tsdown.client.ts` purity rule: no cross-plugin value
 * imports), so the card may only reach the outside world through cordis
 * services - here `ctx.settingsScope` for the section and `ctx.slots` for the
 * registration - plus the baseline `react` module.
 *
 * The bundle is written by hand in the loader format every plugin bundle uses
 * (`window.__ModuleLoader__.load({ id, factory })`): running it only registers
 * the factory, and the module body materializes on first use.
 */
window.__ModuleLoader__.load({
	id: 'dsh-web-search-clinepass',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const React = require('react');

		/** Settings namespace this card edits; must equal the Host plugin's. */
		const NAMESPACE = 'web-search-clinepass';

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

		const S = {
			card: { border: '1px solid rgba(127,127,127,0.28)', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' },
			head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
			title: { margin: '0 0 4px', fontSize: '15px', fontWeight: 600 },
			desc: { margin: 0, fontSize: '12px', opacity: 0.65, lineHeight: 1.5 },
			badge: { flex: 'none', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(127,127,127,0.4)', opacity: 0.8 },
			field: { display: 'flex', flexDirection: 'column', gap: '5px' },
			label: { fontSize: '12px', fontWeight: 500 },
			hint: { fontSize: '11px', opacity: 0.6, lineHeight: 1.5 },
			input: { width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: '13px', borderRadius: '7px', border: '1px solid rgba(127,127,127,0.35)', background: 'transparent', color: 'inherit' },
			check: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' },
			foot: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
			button: { padding: '6px 14px', fontSize: '12px', borderRadius: '7px', border: '1px solid rgba(127,127,127,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer' },
			primary: { padding: '6px 14px', fontSize: '12px', borderRadius: '7px', border: '1px solid rgba(127,127,127,0.4)', background: 'rgba(127,127,127,0.16)', color: 'inherit', cursor: 'pointer', fontWeight: 600 },
			status: { fontSize: '11px', opacity: 0.7, marginLeft: 'auto' },
		};

		/** One labelled control, with a per-field reset when the Host marks it overridden. */
		function renderField(field, draft, overridden, disabled, onEdit, onReset) {
			const id = 'web-search-clinepass-' + field.key;
			let control;
			if (field.kind === 'boolean') {
				control = React.createElement('label', { style: S.check, htmlFor: id, key: 'control' },
					React.createElement('input', { id, type: 'checkbox', checked: draft[field.key] === true, disabled, onChange: (event) => onEdit(field, event.target.checked) }),
					React.createElement('span', null, draft[field.key] === true ? '已启用' : '已禁用'));
			} else if (field.kind === 'select') {
				control = React.createElement('select', { id, style: S.input, value: draft[field.key], disabled, onChange: (event) => onEdit(field, event.target.value), key: 'control' },
					field.options.map((option) => React.createElement('option', { key: option, value: option }, option)));
			} else if (field.kind === 'textarea') {
				control = React.createElement('textarea', { id, style: Object.assign({}, S.input, { minHeight: '54px', resize: 'vertical' }), value: draft[field.key], disabled, onChange: (event) => onEdit(field, event.target.value), key: 'control' });
			} else {
				control = React.createElement('input', { id, type: field.kind === 'number' ? 'number' : 'text', style: S.input, value: draft[field.key], disabled, onChange: (event) => onEdit(field, event.target.value), key: 'control' });
			}
			return React.createElement('div', { style: S.field, key: field.key },
				React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px' } },
					React.createElement('label', { style: S.label, htmlFor: id }, field.label),
					overridden ? React.createElement('button', { type: 'button', style: Object.assign({}, S.button, { padding: '1px 7px', fontSize: '10px' }), disabled, onClick: () => onReset(field) }, '恢复默认') : null),
				control,
				React.createElement('p', { style: S.hint }, field.hint));
		}

		/**
		 * The card: the same controls the built-in web-search card offers, minus the
		 * credential field - this provider resolves its key from the selected model's
		 * own route, so there is nothing to store here.
		 */
		function WebSearchClinepassCard(props) {
			const scope = props.scope;
			const subscribe = React.useCallback((listener) => scope.subscribe(listener), [scope]);
			const getSnapshot = React.useCallback(() => scope.getSnapshot(), [scope]);
			const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const section = snapshot.status === 'ready' && snapshot.value !== null && typeof snapshot.value === 'object' ? snapshot.value : {};
			const user = snapshot.user !== null && typeof snapshot.user === 'object' ? snapshot.user : {};
			const [draft, setDraft] = React.useState(() => readDraft(section));
			const [status, setStatus] = React.useState(null);
			const [busy, setBusy] = React.useState(false);
			const draftRef = React.useRef(draft);
			const seedRef = React.useRef(JSON.stringify(readDraft(section)));
			draftRef.current = draft;
			React.useEffect(() => {
				const dirty = JSON.stringify(draftRef.current) !== seedRef.current;
				if (dirty) return;
				const next = readDraft(section);
				setDraft(next);
				seedRef.current = JSON.stringify(next);
			}, [section]);
			const dirty = JSON.stringify(draft) !== seedRef.current;
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
				? (dirty ? '未保存修改' : (status === null ? '' : status.text))
				: (snapshot.status === 'loading' ? '正在读取配置…' : '本部署不对外暴露这个命名空间');
			const statusStyle = status !== null && status.kind === 'error' ? Object.assign({}, S.status, { opacity: 1 }) : S.status;
			return React.createElement('section', { style: S.card },
				React.createElement('div', { style: S.head },
					React.createElement('div', null,
						React.createElement('h3', { style: S.title }, '网页搜索（当前模型）'),
						React.createElement('p', { style: S.desc }, '用当前会话选中的模型调用网关自带的搜索工具联网检索，替代内置的 DeepSeek 专用搜索。')),
					dirty ? React.createElement('span', { style: S.badge }, '未保存') : null),
				FIELDS.map((field) => renderField(field, draft, Object.prototype.hasOwnProperty.call(user, field.key), disabled, editField, resetField)),
				React.createElement('div', { style: S.foot },
					React.createElement('button', { type: 'button', style: S.primary, disabled: disabled || !dirty, onClick: save }, busy ? '保存中…' : '保存'),
					React.createElement('button', { type: 'button', style: S.button, disabled: disabled || !dirty, onClick: discard }, '放弃'),
					React.createElement('button', { type: 'button', style: S.button, disabled, onClick: clearAll }, '全部恢复默认'),
					React.createElement('span', { style: statusStyle }, statusText)));
		}

		/**
		 * Mount the card: bind this namespace's settings scope and register the slot
		 * entry the plugins settings page dispatches on.
		 * @param ctx - the browser plugin context.
		 */
		async function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: NAMESPACE });
			ctx.slots.inject('settings.plugin.item', function* () {
				yield ctx.slots.register({
					name: 'settings.plugin.item',
					key: NAMESPACE,
					inject: () => ({ scope }),
				}, WebSearchClinepassCard);
			});
		}

		exports.apply = apply;
		exports.inject = ['slots', 'settingsScope'];
		// Test-only surface: the card's pure helpers and field table, so this repository can unit-test the write planner without a browser.
		exports.__internals = { NAMESPACE, FIELDS, TOOLS, readDraft, buildOps, clearOps, WebSearchClinepassCard };
		return module.exports;
	},
});
