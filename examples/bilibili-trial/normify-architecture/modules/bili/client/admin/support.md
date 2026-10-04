---
uid: 13cce860
id: bili.client.admin.support
parent: bili.client.admin
state: planned
tags: ["worker:adm-support"]
name: {zh: "客服工作台", en: "Support Console"}
description:
  zh: >
      工单列表与会话视图、内部备注、跨域查证面板、升级与满意度统计。
      
  en: >
      Ticket list and conversation view, internal notes, cross-domain lookup, escalation and CSAT stats.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/admin/src/features/support/index.ts"
  - path: "apps/admin/src/features/support/pages/SupportConsolePage.tsx"
  - path: "apps/admin/src/features/support/tests/support.test.tsx"
apis: []
types:
  - name: "SupportConsoleState"
    description: {zh: "客服台状态", en: "Support console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"tickets":{"type":"array","description":"工单","items":{"$ref":"urn:normify:bili.ops.support:SupportTicket"}},"replies":{"type":"array","description":"回复","items":{"$ref":"urn:normify:bili.ops.support:SupportReply"}},"activeTicketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"lookupPanelOpen":{"type":"boolean","description":"查证面板是否展开"}},"required":["tickets"]}
deps:
  - kind: call
    to: bili.ops.support
    to_api: "GET /api/v1/ops/support/tickets"
    label: {zh: "工单与回复", en: "Tickets and replies"}
---
