---
uid: 86c341c2
id: delivery.waves
parent: delivery
state: planned
tags: [planned, "worker:W-ASSEMBLY"]
name: {zh: "可并行波次", en: "Parallelisable waves"}
description:
  zh: >
      按 needs 最长路径分层得到的可并行阶段（同波次之间无相互 needs）
  en: >
      Parallelisable stages derived from the longest needs path
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "plan/waves.json"
apis:
  - protocol: file
    path: "plan/waves.json"
    description:
      zh: >
          波次计划文件
      en: >
          Wave plan file
types:
  - name: "Wave"
    description: {zh: "波次", en: "Wave"}
    schema: {"type":"object","additionalProperties":false,"description":"同一波次内的单元可以并行开发（无相互 needs）；字段名与 plan/waves.json 实例一致","properties":{"wave":{"type":"string","description":"波次编号","pattern":"^W[0-9]+$"},"depth":{"type":"integer","description":"依赖深度"},"units":{"type":"array","description":"单元 id","items":{"type":"string","description":"条目 / Item"}},"parallel":{"type":"integer","description":"可并行单元数"}},"required":["wave","depth","units","parallel"]}
  - name: "WavePlan"
    description: {zh: "波次计划", en: "Wave plan"}
    schema: {"type":"object","additionalProperties":false,"description":"全部波次与来源计划摘要；字段名与 plan/waves.json 实例严格一致（snake_case）","properties":{"generated_at":{"type":"string","description":"生成时间"},"rule":{"type":"string","description":"分层规则"},"note":{"type":"string","description":"说明"},"source_plan_id":{"type":"string","description":"来源计划 id"},"source_plan_digest":{"type":"string","description":"来源计划 CAS 摘要","pattern":"^[0-9a-f]{64}$"},"base_commit":{"type":"string","description":"固定 Git 基线","pattern":"^[0-9a-f]{40}$"},"waves":{"type":"array","description":"波次列表","items":{"$ref":"urn:normify:delivery.waves:Wave"}}},"required":["generated_at","rule","note","waves"]}
deps:
  - kind: reference
    to: delivery.requirements
    label: {zh: "波次基于需求计划", en: "Waves derive from requirements"}
---
