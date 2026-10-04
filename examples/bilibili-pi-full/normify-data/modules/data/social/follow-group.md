---
uid: 3e688d90
id: data.social.follow-group
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "关注分组", en: "Follow group"}
description:
  zh: >
      分组与顺序
  en: >
      Follow groups and ordering
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/follow_group.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_follow_group"
    description:
      zh: >
          权威表 social_follow_group（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_follow_group (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/follow_group.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FollowGroupRow"
    description: {zh: "分组与顺序", en: "Follow groups and ordering"}
    schema: {"type":"object","additionalProperties":false,"description":"分组与顺序 / Follow groups and ordering｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_follow_group；主键 PK(id)；无唯一约束；索引 INDEX(ownerId)；外键 FK(ownerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"name":{"type":"string","description":"name 字段 / Field name"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","ownerId","name","orderIndex","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
---
