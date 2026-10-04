# Code Normify · Architecture tools for PromptManager

English · [简体中文](./README.md)

`@promptmanager/code-normify` 0.7.0 is a local architecture and branch planning tool for PromptManager. Design module trees, named data types and API inputs/outputs before implementation; validate and render the design, then organize development groups around independently verifiable delivery units and produce fixed contracts for implementation Workers. It provides **43 tools**, a Node.js ESM library and a managed stdio MCP server. Requires **Node.js 20+**.

Normify owns architecture data, diagnostics, compilation, rendering and static branch plans. PromptManager owns real group identity, role permissions, execution group branches and workspaces, managed process leases, Worker scheduling, review, integration and task state. This repository provides integration examples; it does not modify PromptManager or register new host IPC channels.

## Design before implementation

1. Call `normify_schema_get` for the current contract and `normify_graph_get` for the complete graph and its `digest`.
2. Design the module tree, named types and API `input` / `output` contracts. Use `state: "planned"`, `fingerprint: "pending"` and intended `source.path` values for future code. Preserve unrelated modules and allocated `uid` values.
3. Resolve every error from `normify_graph_validate({ graph })`, then submit the complete graph with `normify_graph_put({ graph, expect_digest })`. A successful submission generates compiled artifacts and HTML.
4. Call `normify_branch_plan_suggest` to suggest groups from explicit scope, together constraints and file overlap. Edit that same `BranchPlan` to declare requirement coverage, independent verification, resource isolation and external dependency strategies. Validate it with `normify_branch_plan_validate`, then save with `normify_branch_plan_put({ plan, expect_digest })`.
5. Read a frozen group packet with `normify_branch_packet({ unit_id })`, or export a PromptManager group plan with `normify_branch_plan_export({ lead_ref })`. The host checks the plan, configuration and permissions through its existing authorization and scheduling flow before creating groups. A group can contain multiple Workers, with one writer responsible for each file. `normify_work_packet({ ids })` remains available for module contracts.
6. Record implementation with `normify_change_open` and execute the delivery unit's declared verification commands and scenarios. After implementation, run `normify_module_refresh({ ids, activate: true })`, `normify_validate` and `normify_change_close({ id, render: true })`; inspect diagnostics, test evidence and the recorded code revision.

Use brief, synchronization, module CRUD and policy tools for incremental maintenance. Normify never writes source code; authorized implementation Workers do. Submit architecture changes through the tools.

## Unified JSON contract

The editable graph is `{ schema_version: 1, modules: Module[], layouts: LayoutData[] }`. Store only `parent` and outgoing `deps`; children, API indexes and type relations are derived. This complete planned graph includes a future source file, an IPC API and named input/output types:

```json
{
  "schema_version": 1,
  "modules": [
    {
      "uid": "aabbccdd", "id": "app", "parent": null,
      "name": { "zh": "应用", "en": "Application" },
      "description": { "zh": "应用模块树。", "en": "Application module tree." },
      "source": [],
      "revision": "0000000000000000000000000000000000000000",
      "updated_at": "2026-10-03T00:00:00.000Z",
      "fingerprint": "pending", "state": "planned"
    },
    {
      "uid": "11223344", "id": "app.worker", "parent": "app",
      "name": { "zh": "任务执行", "en": "Task execution" },
      "description": { "zh": "执行一个任务并返回结果。", "en": "Execute a task and return its result." },
      "source": [{ "path": "src/main/worker.ts" }],
      "revision": "0000000000000000000000000000000000000000",
      "updated_at": "2026-10-03T00:00:00.000Z",
      "fingerprint": "pending", "state": "planned",
      "types": [
        {
          "name": "Request",
          "description": { "zh": "任务输入。", "en": "Task input." },
          "schema": {
            "type": "object",
            "properties": { "taskId": { "type": "string", "minLength": 1 } },
            "required": ["taskId"], "additionalProperties": false
          }
        },
        {
          "name": "Result",
          "description": { "zh": "任务结果。", "en": "Task result." },
          "schema": {
            "type": "object",
            "properties": { "completed": { "type": "boolean" } },
            "required": ["completed"], "additionalProperties": false
          }
        }
      ],
      "apis": [{
        "protocol": "ipc", "path": "app:execute",
        "description": { "zh": "执行任务。", "en": "Execute a task." },
        "input": { "module": "app.worker", "name": "Request" },
        "output": { "module": "app.worker", "name": "Result" }
      }]
    }
  ],
  "layouts": []
}
```

`types[].schema` uses **JSON Schema 2020-12**. Cross-type `$ref` values use `urn:normify:<module-id>:<type-name>`; API type references use `{ module, name }`. Containers cannot declare `types` or `apis`. References must resolve to declared types. `ipc.path` is an IPC channel, with API key `ipc:app:execute`. Planned `source.path` values describe target files relative to the bound source repository.

### Complete replacement and CAS

`normify_graph_put` replaces the complete graph: omitted modules and layouts are deleted. MCP marks it as destructive. Read first and pass the returned 64-character SHA-256 digest:

```js
const current = await call('normify_graph_get', {})
const candidate = current.graph // Edit the complete snapshot.
await call('normify_graph_validate', { graph: candidate })
await call('normify_graph_put', { graph: candidate, expect_digest: current.digest })
```

`call` denotes the established tool invocation interface. The digest covers module, layout, policy and change source data. A stale digest returns `graph/conflict`; reread and reconcile actual changes before resubmitting. The candidate is validated and compiled before replacing the current graph. Managed services coordinate in-process and cross-process access with a project lock.

Managed CRUD writes use a snapshot, execution, project validation and commit/rollback boundary. Invalid dependency or type changes return `rolled_back: true` instead of leaving an inconsistent graph. Editing tools with `dry_run` execute in an isolated candidate directory, run L2 validation and remove the candidate; preview success requires more than a valid patch shape.

`graph_put` builds and renders automatically. After ordinary CRUD changes, call `normify_build` before `normify_render`. Compilation records the architecture source digest in `tree.project.source_digest` and `receipt.source_digest`. Rendering checks the current digest and tree SHA-256; changed source data returns `render/stale-tree`, while a mismatched receipt or tree is rejected. The receipt's `artifacts` records tree, outline and api-index only, without a self-referential receipt hash.

### Work packets

`normify_work_packet({ ids: ["app.worker"] })` returns a fixed `digest`, selected modules and Markdown bodies, external dependencies and shared types, `write_paths`, conflicts and acceptance requirements. Overlap with an unselected leaf's target files prevents independent assignment. Canonical source locations are compared, including junction aliases and Windows case differences.

`write_paths` is a work allocation contract; actual source write permissions come from PromptManager configuration. A packet does not grant permissions, create Workers, update task state or replace authorization, scheduling, verification and merge flows. Built-in coordinator role limits still apply; grant architecture tools to an authorized design or Worker instance that may use MCP.

### Plan group branches around independent delivery

A delivery unit must be implementable and verifiable against a fixed Git baseline. It may contain several leaf modules and several Workers. PromptManager currently gives each execution group one branch/worktree; each file within the group must have one responsible writer. Module and API granularity supports architecture navigation and does not determine Worker count.

Suggestion, editing, validation and persistence use the same `BranchPlan` JSON shape. `normify_schema_get` exposes its `branch_plan` schema, and `branch-plan.json` stores the plan. Top-level fields are `schema_version: 1`, `id`, bilingual `title`, `graph_digest`, `base_commit`, `scope`, `requirement_ids`, `together` and `units`:

- `scope` explicitly selects modules and expands selected containers to their non-deprecated leaves. `units[].modules` must list leaf IDs explicitly. Every scoped leaf belongs to exactly one unit.
- `together` records modules that must change together. Modules sharing a canonical source file must also share a unit, including separate line ranges, junction aliases and Windows case differences. File overlap with an out-of-scope module requires a scope or file-boundary change.
- `graph_digest` freezes the architecture. `base_commit` must be a readable full Git commit OID in the bound repository. The plan's CAS `digest` is the SHA-256 of the raw `branch-plan.json` bytes, separate from the graph digest. With no saved file, `get` returns `plan: null` and the empty-byte digest.
- `requirement_ids` records formal requirements. Each needs at least one responsible unit; several units may share a requirement. Every unit needs a nonempty requirement list, and its verification scenarios must cover every requirement it owns.
- `verification.commands` declares `{ id, argv: string[], cwd }`, with `cwd` relative to the bound repository. `cases` declares `{ id, description, requirement_ids, command_ids }`. Commands and scenarios must be nonempty. Required databases, ports, filesystem directories and services use `resources: [{ id, kind, description, isolation: "unit" }]`; the host implements per-unit isolation. Use an empty array when no such resources are needed.

`suggest` forms initial groups only from canonical file overlap and explicit `together` constraints. It does not infer business meaning, requirement ownership, verification scenarios or implementation order, and does not turn a call graph into `needs`. A successfully generated candidate returns `ok: true`. Empty verification, unassigned requirements and `unresolved` dependencies make `ready: false`, with gaps in `readiness.errors`. Structural errors still return `ok: false`. Complete the candidate before saving or dispatching it.

Each unit's `external_dependencies` declares `{ module, mode, fixture_paths }` for every effective external dependency. Units inherit explicit `deps` from their leaves' ancestor containers, expanding container targets to leaves. Together with each leaf's own dependencies, API input/output and schema type references, these form the frozen contract context. Modules within the same unit are excluded from the external set. These relationships do not automatically create `needs` or merge units:

| `mode` | Independent verification requirement |
| --- | --- |
| `baseline` | Every source file of the dependency exists as a readable, nonempty file in `base_commit`; `fixture_paths: []`. |
| `contract` | Use contract test doubles or fixtures. `fixture_paths` must be nonempty; each file belongs to the fixed baseline or this unit's explicit write scope. |
| `after` | The dependency's responsible unit must be in the explicit `needs` prerequisite chain; `fixture_paths: []`. |
| `unresolved` | Verification strategy is undecided; formal validation, persistence and packet retrieval are blocked. |

For example, publication and playback can be developed independently using a fixed contract and a playback fixture despite their runtime calls. Declare `after` and `needs` when the actual implementation must be delivered first. `needs` rejects self-dependencies, missing units and cycles.

```js
const current = await call('normify_branch_plan_get', {})
const suggested = await call('normify_branch_plan_suggest', {
  id: 'video-development',
  title: { zh: '视频交付计划', en: 'Video delivery plan' },
  base_commit: baseCommit, // Full commit OID in the bound repository.
  scope: ['video.publication', 'video.player'],
  requirement_ids: ['REQ-publish', 'REQ-play'],
  together: []
})
if (!suggested.ok) throw new Error(JSON.stringify(suggested.errors))
const candidate = structuredClone(suggested.plan)
// Fill requirement coverage, commands/scenarios/resources and all dependency strategies.
const checked = await call('normify_branch_plan_validate', { plan: candidate })
if (!checked.ok) throw new Error(JSON.stringify(checked.errors))
await call('normify_branch_plan_put', {
  plan: candidate,
  expect_digest: current.digest
})
```

`put` and `delete` require the current plan digest. `branch/conflict` requires rereading and reconciling changes. `dry_run: true` previews without replacing or deleting the saved plan. A changed architecture causes `branch/graph-drift`; packet retrieval and export reject the stale plan too. Reconfirm the plan against the new graph.

`normify_branch_packet({ unit_id })` returns module bodies, full data/API contracts, external dependencies, `write_paths`, verification declarations and three frozen versions: `base_commit`, `graph_digest` and `plan_digest`. `normify_branch_plan_export({ lead_ref })` returns a `worker_plan` with one `role: "lead"` item per unit. Its `spec` is the frozen packet JSON; `requirementIds` and `needs` match the host's existing group plan structure. The plan identifier includes the logical plan ID and plan digest to distinguish versions.

`lead_ref` is a leader template reference, not real group identity or authorization. PromptManager must check the formal `WorkerConfiguration` and reuse its existing branch, worktree, role, Worker-state, review and integration services. This change provides a static export adapter; end-to-end application wiring remains host work. Zero errors from `validate`, `packet` or `export` only establishes a valid static declaration. The tools do not run verification commands or establish runtime resource isolation or integration success.

Host wiring must create worktrees from the packet's `base_commit` and resolve, freeze and materialize prerequisite delivery commits for the `after` strategy. The current PromptManager creates ordinary lead worktrees from `main`, while `needs` only waits for task completion. These paths do not yet consume the branch contract, so a static export cannot establish that execution is connected.

The runnable example is `examples/branch-development/example.mjs` in the [source repository](https://github.com/wishbreeze/code-normify). Run it from that checkout with Git and Node.js 20+. The npm package does not include `examples/`:

```sh
npm run build
node examples/branch-development/example.mjs
```

It creates a temporary Git baseline and planned graph, completes two independent delivery units, reads packets and exports a group plan. It prints summaries and preserves the artifact location for inspection. Business verification commands in the example are declarations only.

## Managed MCP integration

Build and pack this repository, then install the generated tarball in the target project:

```sh
npm ci
npm run build
npm pack
# In the target project, use the actual generated package path.
npm install --save-dev /absolute/path/promptmanager-code-normify-0.7.0.tgz
```

This uses a local build and does not assume an npm publication. Each execution group must have this package and its dependencies through PromptManager's existing dependency preparation flow.

PromptManager uses `mcp_servers`. `command = "node"` resolves to its installed toolchain's fixed Node executable; arguments are passed unchanged and the process starts in the group's workspace. Do not configure `command = "normify-mcp"`: the native command contract accepts fixed command names or an absolute executable path, without a PATH search.

```toml
[mcp_servers.normify-design]
command = "node"
args = ["node_modules/@promptmanager/code-normify/lib/mcp.js", "--repo-root", ".", "--data-dir", "normify-architecture", "--access", "write"]

[mcp_servers.normify-read]
command = "node"
args = ["node_modules/@promptmanager/code-normify/lib/mcp.js", "--repo-root", ".", "--data-dir", "normify-architecture", "--access", "read"]
```

All three arguments are required. Relative paths resolve against the **host startup cwd** before the service receives absolute paths. Absolute paths also work. `.` follows each group's worktree, avoiding source evidence pointing to the primary checkout. The data directory must be named `normify-<slug>`.

Registering a server does not grant tools. This is an exact design instance `AgentSpec` fragment; configure role, MCP semantic group and native sandbox grants through existing PromptManager configuration:

```json
{
  "mcpBindings": [{
    "serverId": "normify-design",
    "tools": ["normify_schema_get", "normify_graph_get", "normify_graph_validate", "normify_graph_put", "normify_work_packet", "normify_branch_plan_suggest", "normify_branch_plan_get", "normify_branch_plan_validate", "normify_branch_plan_put", "normify_branch_plan_delete", "normify_branch_packet", "normify_branch_plan_export"]
  }]
}
```

For a read-only instance:

```json
{
  "mcpBindings": [{
    "serverId": "normify-read",
    "tools": ["normify_schema_get", "normify_graph_get", "normify_module_get", "normify_work_packet", "normify_branch_plan_get", "normify_branch_packet", "normify_branch_plan_export"]
  }]
}
```

Injected names include `mcp__normify-design__normify_graph_get`; bindings use original server tool names. `read` exposes only read tools. `write` exposes all 43, subject to exact host bindings. Model arguments cannot override `project`, `dir` or `repoRoot`. Source reads, artifact paths and symbolic links remain within bound workspace constraints.

Stdout carries only MCP protocol; logs use stderr. Business failures retain `{ ok, errors, warnings, ... }` with MCP `isError`; exceptions use MCP error responses. Cancellation prevents engine entry, but cannot establish that an operation already started produced no writes.

## Electron main-process ESM library

Use the same managed tools without introducing a second filesystem or validation implementation:

```ts
import { join } from 'node:path'
import { createPromptManagerTools } from '@promptmanager/code-normify/service'

export async function openArchitectureTools(groupWorkspace: string) {
  const tools = await createPromptManagerTools({
    repoRoot: groupWorkspace,
    dataDir: join(groupWorkspace, 'normify-architecture'),
    access: 'write',
    requireBilingual: true
  })
  return new Map(tools.map(tool => [tool.name, tool]))
}
```

The host supplies an authorized absolute group workspace. Tools expose `name`, `description`, `behavior`, standard JSON Schema `parameters` and `execute(args)`. Every result is an object with `ok`, `errors` and `warnings`.

React receives read-only graph or preview data through PromptManager's existing main-process IPC boundary. Do not import this package or `node:fs` in the renderer, or scan the repository there. Host wiring must reuse existing IPC, role and task resource authorization; this example adds no IPC channel.

## 43 tools

| Category | Tools |
| --- | --- |
| Graph and work contracts (5) | `normify_schema_get`, `normify_graph_get`, `normify_graph_validate`, `normify_graph_put`, `normify_work_packet` |
| Branch delivery plans (7) | `normify_branch_plan_suggest`, `normify_branch_plan_get`, `normify_branch_plan_validate`, `normify_branch_plan_put`, `normify_branch_plan_delete`, `normify_branch_plan_export`, `normify_branch_packet` |
| Navigation and queries (8) | `normify_tree_list`, `normify_module_get`, `normify_module_list`, `normify_search`, `normify_outline`, `normify_deps_find`, `normify_brief`, `normify_help` |
| Project and module editing (7) | `normify_project_init`, `normify_module_upsert`, `normify_module_patch`, `normify_module_batch`, `normify_module_move`, `normify_module_promote`, `normify_module_delete` |
| Evidence, synchronization and validation (5) | `normify_fingerprint`, `normify_sync`, `normify_module_refresh`, `normify_validate`, `normify_check` |
| Policy (2) | `normify_policy_get`, `normify_policy_upsert` |
| Development changes (4) | `normify_change_open`, `normify_change_update`, `normify_change_list`, `normify_change_close` |
| Layouts and artifacts (5) | `normify_layout_get`, `normify_layout_upsert`, `normify_layout_delete`, `normify_build`, `normify_render` |

Use `normify_schema_get` or MCP `tools/list` for exact parameters. Tools support `normify_help({ topic: "tool:normify_module_patch" })` for parameter guidance. Help uses the current instance's read or write tool catalog.

## Data and verification

Persistence uses module Markdown under `modules/`, layout JSON under `renders/`, `policy.yml`, `changes/` and the explicit delivery units, verification and external dependency strategies in `branch-plan.json`. Compiled artifacts are `tree.json`, `outline.md`, `api-index.json`, `receipt.json` and `normify.html`. The standalone HTML viewer supports drill-down, search and language switching.

`graph_get` / `graph_put` reuse existing persistence. `tree.json` is compiled output, not a second writable source. See [the specification](./docs/SPEC.zh-CN.md) and [normify-gen](./skills/normify-gen/SKILL.md).

```sh
npm run check
npx playwright install chromium
npm run test:render
```

Checks cover engine regressions, named types and references, graph CAS, work packet file overlap, deletion change closure, real SDK stdio lifecycle, relative startup paths, read-only permissions, boundary rejection and cancellation. Browser checks cover type and API navigation, search, full schemas, language switching and narrow screens. Passing these checks does not establish that PromptManager application wiring is complete.

## Attribution and license

Derived from [yan-mc/dsh-normify](https://github.com/yan-mc/dsh-normify), preserving its architecture engine, viewer and MIT license. The derived repository is [wishbreeze/code-normify](https://github.com/wishbreeze/code-normify); 0.6.0 replaces the host entry with a PromptManager tool library and managed MCP, and 0.7.0 adds branch plans organized by independently verifiable delivery units. Original attribution **Copyright (c) 2026 yan-mc** remains in [LICENSE](./LICENSE).
