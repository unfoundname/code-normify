---
uid: b4168ef3
id: data.channel.dressup-ownership
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "装扮拥有关系", en: "Dress-up ownership"}
description:
  zh: >
      用户装扮有效期
  en: >
      User dress-up validity
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/dressup_ownership.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_dressup_ownership"
    description:
      zh: >
          权威表 channel_dressup_ownership（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_dressup_ownership (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/dressup_ownership.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DressupOwnershipRow"
    description: {zh: "用户装扮有效期", en: "User dress-up validity"}
    schema: {"type":"object","additionalProperties":false,"description":"用户装扮有效期 / User dress-up validity｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_dressup_ownership；主键 PK(id)；唯一约束 UNIQUE(userId,dressupId)；无二级索引；外键 FK(userId→data.identity.user.id, dressupId→data.channel.dressup-item.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"dressupId":{"type":"string","description":"外键指向 data.channel.dressup-item.id（多对一，由 RDS 实施） / Foreign key to data.channel.dressup-item.id (many-to-one, enforced by RDS)"},"validTo":{"type":"string","format":"date-time","description":"validTo 字段 / Field validTo"},"acquiredAt":{"type":"string","format":"date-time","description":"acquiredAt 字段 / Field acquiredAt"}},"required":["id","userId","dressupId","acquiredAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.channel.dressup-item
    label: {zh: "dressupId→dressup-item.id，多对一", en: "dressupId->dressup-item.id,"}
---
