---
uid: 4e1a08df
id: data.projection.unread-counter
parent: data.projection
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:search"]
name: {zh: "未读计数投影", en: "Unread counter projection"}
description:
  zh: >
      按分类的未读聚合
  en: >
      Unread aggregation per category
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/unread_counter.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_unread_counter"
    description:
      zh: >
          权威表 projection_unread_counter（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_unread_counter (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/unread_counter.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "UnreadCounterRow"
    description: {zh: "按分类的未读聚合", en: "Unread aggregation per category"}
    schema: {"type":"object","additionalProperties":false,"description":"按分类的未读聚合 / Unread aggregation per category｜存储归属 SEARCH｜唯一写入所有者 W-MESSAGE｜表 projection_unread_counter；主键 PK(id)；唯一约束 UNIQUE(userId,notifyType)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"notifyType":{"type":"string","description":"notifyType 字段 / Field notifyType"},"count":{"type":"integer","description":"count 字段 / Field count"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","notifyType","count","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
