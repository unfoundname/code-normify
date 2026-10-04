---
uid: 81b571f2
id: data.message.notification
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "互动通知", en: "Interaction notification"}
description:
  zh: >
      回复/点赞/关注等通知与已读
  en: >
      Reply, like, follow and other notifications with read state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/notification.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_notification"
    description:
      zh: >
          权威表 message_notification（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_notification (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/notification.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "NotificationRow"
    description: {zh: "回复/点赞/关注等通知与已读", en: "Reply, like, follow and other notifications with read state"}
    schema: {"type":"object","additionalProperties":false,"description":"回复/点赞/关注等通知与已读 / Reply, like, follow and other notifications with read state｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_notification；主键 PK(id)；无唯一约束；索引 INDEX(userId,unread,createdAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"notifyType":{"type":"string","description":"notifyType 字段 / Field notifyType"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"payloadJson":{"type":"object","additionalProperties":true,"description":"payloadJson 字段 / Field payloadJson"},"unread":{"type":"boolean","description":"unread 字段 / Field unread"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","notifyType","targetId","targetType","payloadJson","unread","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
