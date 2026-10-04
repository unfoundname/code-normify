---
uid: cd0ae404
id: bili.client.ops.service
parent: bili.client.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "客服与审计台", en: "Customer service and audit console"}
description:
  zh: >
      工单处理、用户检索与操作审计检索
  en: >
      Ticket handling, user lookup and operation audit search
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/ops-console/src/features/service/ServiceConsole.tsx"
  - path: "apps/ops-console/tests/features/service/ServiceConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/ops/service"
    description:
      zh: >
          客服台路由
      en: >
          Service console route
    output: {module: "bili.client.ops.service", name: "ServiceConsoleModel"}
types:
  - name: "ServiceConsoleModel"
    description: {zh: "客服台模型", en: "Service console model"}
    schema: {"type":"object","description":"客服台模型 / Service console model","additionalProperties":false,"properties":{"tickets":{"type":"array","items":{"$ref":"urn:normify:bili.ops.service:ServiceTicket"},"description":"字段 tickets（语义见对应领域契约） / Field tickets"},"auditLogs":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 auditLogs（语义见对应领域契约） / Field auditLogs"}},"required":["tickets","auditLogs"]}
deps:
  - kind: call
    to: bili.ops.service
    label: {zh: "客服工单", en: "Service tickets"}
  - kind: call
    to: bili.ops.auditlog
    label: {zh: "操作审计", en: "Operation audit"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
