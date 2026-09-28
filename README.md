# dsh-web-search-clinepass

> **DSH 插件（DSH plugin）** ｜ DeepSeek Harness `ctx.web` 搜索供应商，替换内置的 `web-search-deepseek`。
>
> ![DSH plugin](https://img.shields.io/badge/DSH-plugin-4b5563)
> ![license](https://img.shields.io/badge/license-MIT-blue)
> ![node](https://img.shields.io/badge/node-%E2%89%A522-3c873a)

一个 DSH（DeepSeek Harness）插件：**用你当前选中的模型来联网搜索**，替代内置的 `web-search-deepseek`。

内置搜索供应商（`@deepseek-ai/dsh-web-search-deepseek`）把模型写死成 `deepseek-v4-flash`，
并且只认 DeepSeek 官方的 Anthropic 兼容端点（`https://api.deepseek.com/anthropic/v1`）——
所以它只花 DeepSeek 官方的额度，也不跟随你在 UI 里选的模型。

本插件注册一个 id 为 `clinepass` 的搜索供应商，它：

1. 从**当前会话的请求头**读出这一步实际使用的 `provider` / `model`；
2. 从 `llm-pi-ai` 设置里取出这条路由的 `baseURL` / `apiKeyEnv`（也就是 Web「模型」页面写入的那份配置）；
3. 发一次 OpenAI 兼容的 `POST {baseURL}/chat/completions`，在 `tools` 里带上网关的**供应商端执行搜索工具**（`vercel:perplexity_search` 等）；
4. 把模型回答末尾的 `Sources:` 段落解析成 `ctx.web` 需要的来源列表。

搜索跑在你的 ClinePass（或任何 OpenAI 兼容网关）额度上，不碰 DeepSeek 官方 key，也不额外消耗主对话的上下文。

## 为什么必须改配置而不只是装插件

`ctx.web` 的供应商选择是「显式 id 优先」：`@deepseek-ai/dsh-base` 把 `web` 那一行写死为
`searchProvider: deepseek-official`，所以仅仅注册一个新供应商是不会被选中的。
本插件打包成一个 bundle（`dsh.bundle.patch`），它的 `cordis.patch.yml` 同时做两件事：

```yaml
- id: web
  config:
    searchProvider: clinepass
    fetchProvider: http          # patch 会整体替换 config，所以这行必须重述

- insert:
    - id: web-search-clinepass
      name: 'dsh-web-search-clinepass'
      config: {}
```

内置的 `web-search-deepseek` 仍然挂着（不再是选中项），需要时可以随时切回去。

## 安装

```powershell
# 1) 装进 web profile（在插件目录里执行）
node install.mjs --profile web

# 2) 如果这份代码在预览模式，先看拼装结果（不会启动服务）
dsh --profile web --dump-config

# 3) 重启 web 服务后生效
dsh web
```

`install.mjs` 只做两件可逆的事：

- 在 `<DSH_HOME>/profiles/web/node_modules/dsh-web-search-clinepass` 建一个目录联接（junction）指向本目录；
- 把 `dsh-web-search-clinepass` 追加到该 profile `package.json` 的 `dsh.profile.bundles`，并写一条 `file:` 依赖；
  改写前会自动备份 `package.json.bak-install-<时间戳>`。

因为它是一个 bundle，`healProfileModuleFallback` 会在每次启动时自动维护这条链接；
如果你以后在 profile 里跑了 `pnpm install` 发现链接被清掉，重跑一次 `node install.mjs --profile web` 即可。

手动安装（等价，供参考）：

```powershell
# 在 <DSH_HOME>/profiles/web 下
New-Item -ItemType Junction -Path node_modules\dsh-web-search-clinepass -Target D:\project\qujinting\dsh-plugin\web-search
# 然后把 dsh-web-search-clinepass 加进 package.json 的 dsh.profile.bundles 末尾
```

### 卸载

```powershell
node install.mjs --profile web --uninstall
```

移除联接与 bundles 条目（同时会自动备份 package.json）。重启后 `web.searchProvider` 回到 `deepseek-official`，
内置行为完全恢复——插件不改动任何原生文件。

## 配置

设置命名空间：`web-search-clinepass`（会出现在 Web 的「设置 → 插件配置」里，可热改）。

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 关掉后本供应商报告为不可用。 |
| `tool` | `vercel:perplexity_search` | 发给网关的供应商端搜索工具 id。 |
| `provider` / `model` | 空（跟随会话） | 钉死路由与模型，不再跟随 UI 选择。 |
| `baseURL` / `api` / `apiKeyEnv` / `apiKey` | 空 | 钉死端点与凭据。 |
| `headers` | 空 | 额外请求头，合并优先级：`llm-pi-ai` < `routes[provider]` < 本节。 |
| `routes` | `{}` | 按 LLM 路由 id 覆写 `api` / `baseURL` / `apiKeyEnv` / `apiKey` / `headers` / `tool`。 |
| `fallback.provider` / `fallback.model` | 空 | 会话模型不可用时的兜底路由（同样走 `routes` / `llm-pi-ai` 解析）。 |
| `timeoutMs` | `90000` | 单次搜索超时；一次搜索就是一次完整的模型回合。注意 `dsh-tool-web` 自己的 `searchTimeoutMs`（base 里是 60000）才是模型侧的实际外框——实测最慢一次 30.7s。 |
| `maxTokens` | `4096` | 搜索回合的输出上限。太小会让来源列表被截断（实测 2048 时确有截断）。 |
| `temperature` | 未设置 | 不写就不发这个字段（部分推理模型会拒绝它）。 |
| `maxSources` | `10` | 返回给 seam 的来源上限；`dsh-tool-web` 的 `searchMaxResults` 还会再截一次。 |
| `instructions` | 空 | 追加到搜索指令末尾的额外要求。 |
| `recordRequests` | `true` | 每次搜索往会话日志追加一条 `web/clinepass-search-request`（含耗时、工具调用次数、gatewayCost）。 |

绝大多数情况什么都不用配：会话模型是 `clinepass` 这类 OpenAI 兼容网关时，路由信息全部来自
`llm-pi-ai.providers.<route>`（`api` / `baseURL` / `apiKeyEnv`）。

## 工具选择与花费

网关报错时列出的可执行工具共有 6 个：`vercel:perplexity_search`、`vercel:exa_search`、`vercel:parallel_search`、
`vercel:tako_search`、`vercel:browserbase_search`、`vercel:browserbase_fetch`。本插件默认用第一个，
改 `tool` 即可切换。同一问题上实测（网关计费 `gatewayCost`，**每次搜索回合**，非每次检索）：

| 工具 | 来源条数 | 单次 `gatewayCost` |
|---|---|---|
| `vercel:perplexity_search` | 4–11 | ≈ $0.011–0.012 |
| `vercel:parallel_search` | 4–7 | ≈ $0.0066–0.0112（最便宜） |
| `vercel:exa_search` | 3–7 | ≈ $0.0176 |

注意：`dsh-tool-web` 会把 `queries` 数组里的每个 query **并发**各跑一次搜索，
所以一次 `web_search({queries:[q1,q2,q3,q4]})` 就是 4 次模型回合。想省钱就用单条 query。

## 工作原理（细节）

```
agent 调 web_search(queries)
        │  dsh-tool-web 逐条 query 并发调用 ctx.web.search()
        ▼
ctx.web  (searchProvider = clinepass)
        ▼
CurrentModelSearchProvider.search()
   ├─ 选模型   agent.session.requestHeader().config  →  agent.options  →  settings['agent-default-model']
   ├─ 解路由   settings['llm-pi-ai'].providers[provider]  +  本插件 routes/显式钉死
   ├─ 取凭据   ctx.credentials.resolve(apiKeyEnv)  →  launchEnvironment
   ├─ 发请求   POST {baseURL}/chat/completions   tools:[{type:'vercel:perplexity_search'}]
   │            （供应商端执行：网关自己跑检索，模型侧仍然只有一轮 assistant 输出）
   └─ 解析     message.content 末尾的 Sources: 段落 → markdown 链接 + 裸 URL → 去重、取标题、截断
```

### 来源是怎么拿到的

网关只在 `usage.gateway_cost` / `message.provider_metadata.gateway.gatewayToolCalls` 里报告检索次数，
**不返回结构化的 citation 块**——真实 URL 就在回答正文里。所以搜索指令要求模型以固定形状收尾：

```
Sources:
- [页面标题](https://完整.url)
```

解析器优先从这个段落取链接（markdown 标签当标题），取不到才回退到全文扫描；
并把该段落从正文里剥掉，避免同一批 URL 在工具结果里出现两遍。

### 诚实性标记

- `gatewayToolCalls` 存在且为 0：正文追加「网关未实际执行搜索，请视为未经验证」；
- `finish_reason === 'length'`：正文追加「已触及输出上限，回答与来源列表可能不完整」。

## 已验证到哪一步

- **单元测试** `npm test`：19 项，覆盖解析（中文标点、markdown 链接、去重、截断）与路由解析（会话跟随、切换模型、协议不兼容、显式钉死、fallback）。
- **真实 seam 集成** `node test/live-gateway.mjs`：用真实的 `WebRuntime`（`@deepseek-ai/dsh-web`）注册本供应商，
  按 `searchProvider: clinepass` 选中，向 `api.cline.bot` 实发一次搜索，断言来源非空且 `maxResults` 生效。
- **真实 DSH 端到端**：临时 profile（`@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-headless` + 本插件）跑一次真实任务，
  会话日志里出现 4 条 `web/clinepass-search-request`，字段为
  `provider: clinepass` / `model: cline-pass/deepseek-v4.1-flash` / `endpoint: https://api.cline.bot/api/v1/chat/completions` /
  `tool: vercel:perplexity_search` / `executedSearches: 2,2,4,6`，并带回真实来源链接。

## 限制与注意事项

- **只对 OpenAI 兼容且支持供应商端工具的路由生效。** 路由声明了非 chat-completions 协议（例如 `anthropic-messages`）时，
  本供应商直接报告不可用——这是有意的：让网关工具 id 发给不懂它的端点只会得到难懂的错误。
- **切到非网关模型时 `web_search` 会报 `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`。**
  两种处理：在设置里配 `fallback.provider` / `fallback.model` 钉一个网关路由兜底；
  或把 profile 的 `cordis.patch.yml` 里 `web.searchProvider` 改回 `deepseek-official`。
- **凭据只从 `ctx.credentials` 与启动环境读。** 密钥不会进日志、不会进会话记录（记录里只有路由、耗时、费用、检索次数）。
- **`web_fetch` 不受影响**，仍然走内置的 `http` 供应商。
- **供应商端工具是一次完整的模型回合**：延迟实测 8–15 秒，费用按上面那张表计。
- 插件不修改任何原生包文件，卸载后原样恢复。

## 开发

```powershell
# 本仓库是纯 ESM JS（无构建步骤）。测试需要 DSH 的模块闭包可解析：
New-Item -ItemType Junction -Path node_modules -Target $env:USERPROFILE\.dsh\profiles\node_modules

npm test                      # 单元测试（不花钱）
node test/live-gateway.mjs    # 真实网关 + 真实 seam（会花一次搜索的钱）
```

| 文件 | 作用 |
|---|---|
| `src/index.js` | 插件入口：`name` / `inject` / `apply` / 设置命名空间注册。 |
| `src/config.js` | schemastery 配置 schema 与常量。 |
| `src/route.js` | 选模型 + 解端点 + 取凭据（无网络调用）。 |
| `src/gateway.js` | 那一次 HTTP 请求、错误分类、回答与来源的组装。 |
| `src/parse.js` | `Sources:` 段落切分、markdown/裸 URL 提取、去重与标题。 |
| `src/prompt.js` | 搜索指令（固定收尾形状是解析契约的一部分）。 |
| `src/provider.js` | `WebSearchProvider` 实现：`available()` / `search()` / 日志记录。 |
| `cordis.patch.yml` | bundle 层：改 `web.searchProvider` + 插入插件行。 |
| `install.mjs` | 装/卸到某个 profile。 |

## 标注为 DSH 插件

这个仓库用三层标记说明它是 DSH（DeepSeek Harness）的插件项目，前三层是机器可读的：

| 层 | 位置 | 值 |
|---|---|---|
| 清单角色 | `package.json` → `dsh` | `{ "bundle": { "patch": "./cordis.patch.yml" } }` —— profile 启动器据此把这行当作 bundle 层加载。 |
| 包身份 | `package.json` → `name` / `version` / `author` / `license` | 具名且带版本，才会出现在 DSH 的插件清单（`dsh_plugin_packages` 请求字段）里。 |
| 检索关键词 | `package.json` → `keywords` | `dsh-plugin`、`dsh`、`deepseek-harness`、`web-search`、`search-provider`、`clinepass`、`vercel-ai-gateway`、`openai-compatible`。 |
| 仓库主题 | GitHub repo topics | `dsh-plugin`、`deepseek-harness`、`dsh`、`web-search`、`clinepass`、`vercel-ai-gateway`、`openai-compatible`。 |

GitHub 的 topic 与 description 需要仓库权限，`gh` 未安装时用 API 设置：

```powershell
$token = "<你的 GitHub PAT，需要 repo 权限>"
$repo  = "qujinting/dsh-web-search-clinepass"

# topics
curl.exe -X PUT -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" `
  "https://api.github.com/repos/$repo/topics" `
  -d '{"names":["dsh-plugin","deepseek-harness","dsh","web-search","clinepass","vercel-ai-gateway","openai-compatible"]}'

# description
curl.exe -X PATCH -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" `
  "https://api.github.com/repos/$repo" `
  -d '{"description":"DSH plugin: web_search provider that searches with the session\u0027s selected model via gateway-native search tools (vercel:perplexity_search), replacing the built-in DeepSeek-only provider."}'
```

## 许可

MIT，见 [LICENSE](LICENSE)。
