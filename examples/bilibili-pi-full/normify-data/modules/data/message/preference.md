---
uid: aca76100
id: data.message.preference
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "消息偏好", en: "Message preference"}
description:
  zh: >
      分类开关、免打扰与渠道
  en: >
      Category switches, quiet hours and channels
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/preference.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_preference"
    description:
      zh: >
          权威表 message_preference（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_preference (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/preference.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PreferenceRow"
    description: {zh: "分类开关、免打扰与渠道", en: "Category switches, quiet hours and channels"}
    schema: {"type":"object","additionalProperties":false,"description":"分类开关、免打扰与渠道 / Category switches, quiet hours and channels｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_preference；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"channelsJson":{"type":"object","additionalProperties":true,"description":"channelsJson 字段 / Field channelsJson"},"quietHours":{"type":"string","description":"quietHours 字段 / Field quietHours"},"mutedTypesJson":{"type":"object","additionalProperties":true,"description":"mutedTypesJson 字段 / Field mutedTypesJson"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","channelsJson","mutedTypesJson","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
