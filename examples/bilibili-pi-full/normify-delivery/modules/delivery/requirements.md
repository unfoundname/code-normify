---
uid: d7a956f6
id: delivery.requirements
parent: delivery
state: planned
tags: [planned, "worker:W-CONTRACT"]
name: {zh: "正式需求与治理策略", en: "Formal requirements and governance policy"}
description:
  zh: >
      正式需求清单与交付治理策略（契约先冻结、外部依赖必须有策略、业务验收必须独立且未执行）
  en: >
      Formal requirement list and delivery governance policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "plan/requirements.json"
apis:
  - protocol: file
    path: "plan/requirements.json"
    description:
      zh: >
          需求清单与治理策略文件
      en: >
          Requirements and governance policy file
types:
  - name: "DeliveryRequirement"
    description: {zh: "正式需求", en: "Formal requirement"}
    schema: {"type":"object","additionalProperties":false,"description":"来自 requirements.md 的正式需求条目，必须被至少一个交付单元负责","properties":{"requirementId":{"type":"string","description":"需求编号","pattern":"^R[0-9]{2}-[a-z-]+$"},"summary":{"type":"string","description":"需求摘要"},"ownerUnits":{"type":"array","description":"负责单元","items":{"type":"string","description":"条目 / Item"}}},"required":["requirementId","summary","ownerUnits"]}
  - name: "DeliveryPolicy"
    description: {zh: "交付治理策略", en: "Delivery governance policy"}
    schema: {"type":"object","additionalProperties":false,"description":"对全部分支生效的约束","properties":{"contractFreezeFirst":{"type":"boolean","description":"契约必须先冻结"},"externalDependencyModes":{"type":"array","description":"允许的外部依赖策略","items":{"type":"string","description":"条目 / Item"}},"forbiddenModes":{"type":"array","description":"禁止的策略","items":{"type":"string","description":"条目 / Item"}},"exclusiveWritePaths":{"type":"boolean","description":"写入文件必须独占"},"independentAcceptance":{"type":"boolean","description":"每个单元必须有独立验收场景"},"businessAcceptanceExecuted":{"type":"boolean","description":"业务验收是否已执行"}},"required":["contractFreezeFirst","externalDependencyModes","forbiddenModes","exclusiveWritePaths","independentAcceptance","businessAcceptanceExecuted"]}
---
