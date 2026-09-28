/**
 * dsh-web-search-clinepass - a ctx.web search provider that searches with
 * the session's currently selected model instead of one hardcoded endpoint.
 *
 * Replaces the shipped deepseek-official search provider: instead of calling
 * DeepSeek's own Anthropic-compatible Messages endpoint with a fixed model, it
 * sends one OpenAI-compatible chat completion to whichever route the session
 * selected, attaching a provider-executed search tool (vercel:perplexity_search
 * and friends) that the gateway runs server-side. The search therefore rides
 * the user's selected provider and credential, and its own quota.
 *
 * @module dsh-web-search-clinepass
 */
import { Config, PROVIDER_ID } from './config.js';
import { CurrentModelSearchProvider } from './provider.js';

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-clinepass';
/** The web seam this provider registers into. */
export const inject = ['web'];
/** Settings namespace carrying this provider's optional section. */
export const SETTINGS_NAMESPACE = 'web-search-clinepass';
export { Config, CurrentModelSearchProvider, PROVIDER_ID };

/**
 * Register the clinepass search provider with ctx.web.
 *
 * The settings section is optional and installed the same way the shipped
 * providers do it: while the settings service is present the section is the
 * authoritative source, and the composition entry is the fallback.
 *
 * @param ctx - the plugin context.
 * @param config - the composition entry's validated configuration.
 */
export function apply(ctx, config) {
	let current = () => config;
	ctx.inject(['settings'], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, SETTINGS_NAMESPACE, Config, config, {
			setSource(source) {
				current = source;
			},
			onChange() {},
		});
	});
	ctx.web.registerSearchProvider(new CurrentModelSearchProvider(ctx, () => current()));
}
