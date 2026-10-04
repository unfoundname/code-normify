---
uid: 10693e8a
id: data.discover.search-history
parent: data.discover
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:rds"]
name: {zh: "搜索历史", en: "Search history"}
description:
  zh: >
      用户检索词与时间
  en: >
      User queries with timestamps
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/search_history.model.sql"
apis:
  - protocol: rpc
    path: "db.table.discover_search_history"
    description:
      zh: >
          权威表 discover_search_history（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table discover_search_history (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/search_history.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SearchHistoryRow"
    description: {zh: "用户检索词与时间", en: "User queries with timestamps"}
    schema: {"type":"object","additionalProperties":false,"description":"用户检索词与时间 / User queries with timestamps｜存储归属 RDS｜唯一写入所有者 W-DISCOVER｜表 discover_search_history；主键 PK(id)；无唯一约束；索引 INDEX(userId,searchedAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"query":{"type":"string","description":"query 字段 / Field query"},"resultCount":{"type":"integer","description":"resultCount 字段 / Field resultCount"},"searchedAt":{"type":"string","format":"date-time","description":"searchedAt 字段 / Field searchedAt"}},"required":["id","query","resultCount","searchedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
