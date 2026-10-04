---
uid: e4306b38
id: data.contract.t-fd1a069b
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "EntityRef", en: "EntityRef"}
description:
  zh: >
      跨模块实体引用
  en: >
      Cross-module entity reference
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-fd1a069b.json"
apis: []
types:
  - name: "EntityRef"
    description: {zh: "跨模块实体引用", en: "Cross-module entity reference"}
    schema: {"type":"object","additionalProperties":false,"description":"跨域只传引用，不传对方实体全量","properties":{"type":{"type":"string","enum":["user","video","danmaku","comment","dynamic","live_room","article","season","course","order"],"description":"实体类型"},"id":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"required":["type","id"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
