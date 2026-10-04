---
uid: c1403213
id: delivery.u-platform-core
parent: delivery
state: planned
tags: [planned, "worker:W-INFRA"]
name: {zh: "平台底座：接入/RDS/outbox/适配器/部署/迁移", en: "Platform core: ingress, RDS, outbox, adapters, deploy,"}
description:
  zh: >
      交付组：23 个叶子模块、207 个独占目标文件、4 项外部契约（contract 2 / baseline 2 / after 0）、2 条正式需求、3 条业务验收定义（未执行）
  en: >
      Delivery group: 23 leaf modules, 207 exclusive target files, 4 external contracts and 3 business acceptance definitions (not executed)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "plan/units/u-platform-core.json"
apis:
  - protocol: file
    path: "plan/units/u-platform-core.json"
    description:
      zh: >
          该组冻结交接文件（由 branch_packet 与正式计划生成）
      en: >
          Frozen handoff file generated from branch_packet and the saved plan
  - protocol: rpc
    path: "delivery.unit.u-platform-core.dispatch"
    description:
      zh: >
          宿主派发该组的分支/工作树（由 PromptManager 负责，本工具不创建）
      en: >
          Host dispatch of the branch or worktree for this group (PromptManager owns it)
types:
  - name: "UnitContract"
    description: {zh: "交付单元契约", en: "Delivery unit contract"}
    schema: {"type":"object","additionalProperties":false,"description":"该组的范围、写入所有权、真实前置与理由、外部依赖策略与验收定义（冻结自 BranchPlan 与架构图）","properties":{"unitId":{"type":"string","description":"单元 id"},"leadWorker":{"type":"string","description":"负责 Worker"},"workspace":{"type":"string","description":"主要工作区"},"scopeModules":{"type":"array","description":"负责的叶子模块","items":{"type":"string","description":"条目 / Item"}},"writePaths":{"type":"array","description":"独占目标文件","items":{"type":"string","description":"条目 / Item"}},"requirementIds":{"type":"array","description":"负责的正式需求","items":{"type":"string","description":"条目 / Item"}},"needs":{"type":"array","description":"真实前置单元","items":{"type":"string","description":"条目 / Item"}},"needsRationale":{"type":"array","description":"每个前置为什么是真实前置","items":{"type":"string","description":"条目 / Item"}},"externalDependencies":{"type":"array","description":"外部依赖策略明细","items":{"$ref":"urn:normify:delivery.u-platform-core:UnitExternalDependency"}},"callsAreNotOrdering":{"type":"boolean","description":"调用箭头不作为实施先后"},"contractPhase":{"type":"string","description":"契约冻结阶段","enum":["freeze-first","after-needs"]},"graphDigest":{"type":"string","description":"冻结时的架构图摘要","pattern":"^[0-9a-f]{64}$"},"planDigest":{"type":"string","description":"来源计划 CAS 摘要","pattern":"^[0-9a-f]{64}$"},"designCheckCommand":{"type":"string","description":"当前可执行的设计/fixture 检查命令"},"businessTestEntrypoints":{"type":"array","description":"待实现的业务测试入口","items":{"type":"string","description":"条目 / Item"}}},"required":["unitId","leadWorker","workspace","scopeModules","writePaths","requirementIds","needs","needsRationale","callsAreNotOrdering","contractPhase","graphDigest","planDigest","designCheckCommand","businessTestEntrypoints"]}
  - name: "UnitBusinessCase"
    description: {zh: "业务验收定义（未执行）", en: "Business acceptance definition (not executed)"}
    schema: {"type":"object","additionalProperties":false,"description":"明确成功/失败、权限、幂等或状态边界预期，并关联本组待实现的测试入口；executed=false 表示尚未运行","properties":{"caseId":{"type":"string","description":"场景 id"},"requirementIds":{"type":"array","description":"覆盖需求","items":{"type":"string","description":"条目 / Item"}},"expectation":{"type":"string","description":"可判定的预期（成功/失败/权限/幂等/状态边界）"},"testEntry":{"type":"string","description":"待实现的测试入口路径"},"executed":{"type":"boolean","description":"是否已实际执行"},"commandIds":{"type":"array","description":"计划中引用的命令 id","items":{"type":"string","description":"条目 / Item"}}},"required":["caseId","requirementIds","expectation","testEntry","executed","commandIds"]}
  - name: "UnitExternalDependency"
    description: {zh: "外部依赖策略", en: "External dependency strategy"}
    schema: {"type":"object","additionalProperties":false,"description":"跨组依赖的独立验证策略：baseline 固定提交内已有源码 / contract 冻结契约 fixture / after 等待前置单元（含理由）","properties":{"module":{"type":"string","description":"依赖模块 id"},"mode":{"type":"string","description":"策略","enum":["baseline","contract","after"]},"fixturePaths":{"type":"array","description":"契约 fixture 路径","items":{"type":"string","description":"条目 / Item"}},"rationale":{"type":"string","description":"为何该策略足够或为何必须等待真实实现"}},"required":["module","mode","fixturePaths","rationale"]}
deps:
  - kind: call
    to: delivery.u-contract-baseline
    label: {zh: "needs 前置：u-contract-baseline", en: "needs prerequisite:"}
  - kind: reference
    to: delivery.requirements
    label: {zh: "覆盖正式需求", en: "Covers formal requirements"}
  - kind: dataflow
    to: delivery.waves
    label: {zh: "归属并行波次", en: "Belongs to a wave"}
---
