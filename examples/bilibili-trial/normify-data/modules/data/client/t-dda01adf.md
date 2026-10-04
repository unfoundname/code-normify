---
uid: 5df036a7
id: data.client.t-dda01adf
parent: data.client
state: planned
tags: ["worker:adm-support", "projection:data-contract"]
name: {zh: "SupportConsoleState", en: "SupportConsoleState"}
description:
  zh: >
      客服台状态
  en: >
      Support console state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-dda01adf.json"
apis: []
types:
  - name: "SupportConsoleState"
    description: {zh: "客服台状态", en: "Support console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"tickets":{"type":"array","description":"工单","items":{"$ref":"urn:normify:data.ops.t-4da5014e:SupportTicket"}},"replies":{"type":"array","description":"回复","items":{"$ref":"urn:normify:data.ops.t-0b7d5190:SupportReply"}},"activeTicketId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"lookupPanelOpen":{"type":"boolean","description":"查证面板是否展开"}},"required":["tickets"]}
deps:
  - kind: reference
    to: data.ops.t-4da5014e
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.ops.t-0b7d5190
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
