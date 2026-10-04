---
uid: "75710332"
id: data.contract.t-bdd25c72
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "EntityId", en: "EntityId"}
description:
  zh: >
      全局实体 ID（字符串，禁止自增整数）
  en: >
      Global entity id as string
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-bdd25c72.json"
apis: []
types:
  - name: "EntityId"
    description: {zh: "全局实体 ID（字符串，禁止自增整数）", en: "Global entity id as string"}
    schema: {"type":"string","description":"全局唯一实体 ID","minLength":8,"maxLength":64,"pattern":"^[0-9a-z]{8,64}$"}
---
