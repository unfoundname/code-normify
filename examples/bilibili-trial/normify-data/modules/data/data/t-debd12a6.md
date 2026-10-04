---
uid: 05f26fc4
id: data.data.t-debd12a6
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "TableOwnership", en: "TableOwnership"}
description:
  zh: >
      表写入所有者登记
  en: >
      Table write ownership
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-debd12a6.json"
apis: []
types:
  - name: "TableOwnership"
    description: {zh: "表写入所有者登记", en: "Table write ownership"}
    schema: {"type":"object","additionalProperties":false,"description":"跨行约束由 RDS 实施，不在 JSON Schema 中声明已校验","properties":{"table":{"type":"string","description":"表名（snake_case，单数）"},"ownerModule":{"type":"string","description":"唯一业务写入所有者模块 id"},"primaryKey":{"type":"string","description":"主键定义"},"uniques":{"type":"array","description":"唯一约束（含复合唯一）","items":{"type":"string","description":"约束定义"}},"indexes":{"type":"array","description":"索引定义","items":{"type":"string","description":"索引定义"}},"foreignKeys":{"type":"array","description":"外键与基数","items":{"type":"string","description":"外键定义"}},"projectionConsumers":{"type":"array","description":"投影/只读消费者","items":{"type":"string","description":"模块 id"}}},"required":["table","ownerModule","primaryKey"]}
---
