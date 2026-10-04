---
uid: 1afdfbd0
id: bili.client.ops.audit
parent: bili.client.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "审核台", en: "Audit console"}
description:
  zh: >
      待审队列、素材预览、结论提交与抽检
  en: >
      Audit queue, asset preview, decision submission and sampling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/ops-console/src/features/audit/AuditConsole.tsx"
  - path: "apps/ops-console/tests/features/audit/AuditConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/ops/audit"
    description:
      zh: >
          审核台路由
      en: >
          Audit console route
    output: {module: "bili.client.ops.audit", name: "AuditConsoleModel"}
types:
  - name: "AuditConsoleModel"
    description: {zh: "审核台模型", en: "Audit console model"}
    schema: {"type":"object","description":"审核台模型 / Audit console model","additionalProperties":false,"properties":{"tasks":{"type":"array","items":{"$ref":"urn:normify:bili.ops.audit:AuditTask"},"description":"字段 tasks（语义见对应领域契约） / Field tasks"},"selected":{"$ref":"urn:normify:bili.ops.audit:AuditTask","description":"字段 selected（语义见对应领域契约） / Field selected"},"policies":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 policies（语义见对应领域契约） / Field policies"}},"required":["tasks","policies"]}
deps:
  - kind: call
    to: bili.ops.audit
    label: {zh: "审核任务与结论", en: "Audit tasks and decisions"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
