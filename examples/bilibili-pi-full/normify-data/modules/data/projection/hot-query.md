---
uid: "63642e13"
id: data.projection.hot-query
parent: data.projection
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:search"]
name: {zh: "热搜词投影", en: "Hot query projection"}
description:
  zh: >
      热搜词与热度衰减
  en: >
      Hot queries with heat decay
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/hot_query.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_hot_query"
    description:
      zh: >
          权威表 projection_hot_query（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_hot_query (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/hot_query.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "HotQueryRow"
    description: {zh: "热搜词与热度衰减", en: "Hot queries with heat decay"}
    schema: {"type":"object","additionalProperties":false,"description":"热搜词与热度衰减 / Hot queries with heat decay｜存储归属 SEARCH｜唯一写入所有者 W-DISCOVER｜表 projection_hot_query；主键 PK(id)；唯一约束 UNIQUE(query,windowStart)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"query":{"type":"string","description":"query 字段 / Field query"},"heat":{"type":"number","description":"heat 字段 / Field heat"},"windowStart":{"type":"string","format":"date-time","description":"windowStart 字段 / Field windowStart"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","query","heat","windowStart","updatedAt"]}
---
