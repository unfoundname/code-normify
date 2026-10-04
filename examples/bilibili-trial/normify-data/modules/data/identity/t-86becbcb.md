---
uid: 7b6a138b
id: data.identity.t-86becbcb
parent: data.identity
state: planned
tags: ["worker:id-security", "projection:data-contract"]
name: {zh: "DeviceSessionPage", en: "DeviceSessionPage"}
description:
  zh: >
      设备会话分页
  en: >
      Device session page
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/identity/t-86becbcb.json"
apis: []
types:
  - name: "DeviceSessionPage"
    description: {zh: "设备会话分页", en: "Device session page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"会话条目","items":{"$ref":"urn:normify:data.identity.t-cc344e2f:DeviceSession"}},"page":{"$ref":"urn:normify:data.contract.t-d48e49f1:PageMeta"}},"required":["items","page"]}
deps:
  - kind: reference
    to: data.identity.t-cc344e2f
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d48e49f1
    label: {zh: "类型引用", en: "Type reference"}
---
