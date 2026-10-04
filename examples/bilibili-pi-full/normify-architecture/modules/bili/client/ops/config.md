---
uid: cd825e39
id: bili.client.ops.config
parent: bili.client.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "运营配置台", en: "Operations configuration console"}
description:
  zh: >
      推荐位、活动、分类标签与页面编排
  en: >
      Recommendation slots, campaigns, taxonomy labels and page composition
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/ops-console/src/features/config/ConfigConsole.tsx"
  - path: "apps/ops-console/tests/features/config/ConfigConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/ops/config"
    description:
      zh: >
          运营配置路由
      en: >
          Operations config route
    output: {module: "bili.client.ops.config", name: "ConfigConsoleModel"}
types:
  - name: "ConfigConsoleModel"
    description: {zh: "运营配置模型", en: "Operations config model"}
    schema: {"type":"object","description":"运营配置模型 / Operations config model","additionalProperties":false,"properties":{"slots":{"type":"array","items":{"$ref":"urn:normify:bili.ops.recommend:SlotConfig"},"description":"字段 slots（语义见对应领域契约） / Field slots"},"campaigns":{"type":"array","items":{"$ref":"urn:normify:bili.ops.activity:CampaignConfig"},"description":"字段 campaigns（语义见对应领域契约） / Field campaigns"},"partitions":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 partitions（语义见对应领域契约） / Field partitions"}},"required":["slots","campaigns","partitions"]}
deps:
  - kind: call
    to: bili.ops.recommend
    label: {zh: "推荐位配置", en: "Slot configuration"}
  - kind: call
    to: bili.ops.activity
    label: {zh: "活动配置", en: "Campaign configuration"}
  - kind: call
    to: bili.catalog.taxonomy
    label: {zh: "分类标签", en: "Taxonomy labels"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
