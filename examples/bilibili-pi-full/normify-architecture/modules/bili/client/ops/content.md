---
uid: 4bee5c32
id: bili.client.ops.content
parent: bili.client.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "内容治理台", en: "Content governance console"}
description:
  zh: >
      举报、申诉、处罚与版权投诉处理
  en: >
      Reports, appeals, penalties and copyright complaints
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/ops-console/src/features/governance/GovernanceConsole.tsx"
  - path: "apps/ops-console/tests/features/governance/GovernanceConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/ops/governance"
    description:
      zh: >
          内容治理路由
      en: >
          Governance route
    output: {module: "bili.client.ops.content", name: "GovernanceConsoleModel"}
types:
  - name: "GovernanceConsoleModel"
    description: {zh: "治理台模型", en: "Governance console model"}
    schema: {"type":"object","description":"治理台模型 / Governance console model","additionalProperties":false,"properties":{"reports":{"type":"array","items":{"$ref":"urn:normify:bili.ops.report:ReportTicket"},"description":"字段 reports（语义见对应领域契约） / Field reports"},"appeals":{"type":"array","items":{"$ref":"urn:normify:bili.ops.appeal:AppealCase"},"description":"字段 appeals（语义见对应领域契约） / Field appeals"},"complaints":{"type":"array","items":{"$ref":"urn:normify:bili.ops.copyright:CopyrightComplaint"},"description":"字段 complaints（语义见对应领域契约） / Field complaints"}},"required":["reports","appeals","complaints"]}
deps:
  - kind: call
    to: bili.ops.report
    label: {zh: "举报工单", en: "Report tickets"}
  - kind: call
    to: bili.ops.appeal
    label: {zh: "申诉", en: "Appeals"}
  - kind: call
    to: bili.ops.penalty
    label: {zh: "处罚", en: "Penalties"}
  - kind: call
    to: bili.ops.copyright
    label: {zh: "版权投诉", en: "Copyright complaints"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
