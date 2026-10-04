---
uid: 3f877b29
id: data.data.t-ceec596a
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "ReconciliationTable", en: "ReconciliationTable"}
description:
  zh: >
      reconciliation_batch 表
  en: >
      reconciliation_batch table
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-ceec596a.json"
apis: []
types:
  - name: "ReconciliationTable"
    description: {zh: "reconciliation_batch 表", en: "reconciliation_batch table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名 reconciliation_batch"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"ownerModule":{"type":"string","description":"写入所有者：结算与对账服务"}},"required":["table","columns","ownerModule"]}
---
