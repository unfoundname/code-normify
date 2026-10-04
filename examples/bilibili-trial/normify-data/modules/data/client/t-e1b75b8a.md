---
uid: 83c74517
id: data.client.t-e1b75b8a
parent: data.client
state: planned
tags: ["worker:web-social", "projection:data-contract"]
name: {zh: "MessageCenterState", en: "MessageCenterState"}
description:
  zh: >
      消息中心状态
  en: >
      Message center state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-e1b75b8a.json"
apis: []
types:
  - name: "MessageCenterState"
    description: {zh: "消息中心状态", en: "Message center state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"activeConversationId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"unreadTotal":{"type":"integer","description":"总未读","minimum":0},"notifications":{"type":"array","description":"最近通知","items":{"$ref":"urn:normify:data.social.t-a5de5645:NotificationRecord"}},"filter":{"type":"string","enum":["all","reply","like","follow","system"],"description":"过滤"},"error":{"$ref":"urn:normify:data.contract.t-2bb69fd6:ApiError"}},"required":["unreadTotal","filter"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.social.t-a5de5645
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-2bb69fd6
    label: {zh: "类型引用", en: "Type reference"}
---
