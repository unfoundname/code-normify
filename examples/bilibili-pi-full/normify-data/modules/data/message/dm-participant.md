---
uid: 7d49e5ee
id: data.message.dm-participant
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "会话参与者", en: "Conversation participant"}
description:
  zh: >
      会话与用户的成员关系及未读
  en: >
      Membership of users in conversations with unread counts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/dm_participant.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_dm_participant"
    description:
      zh: >
          权威表 message_dm_participant（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_dm_participant (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/dm_participant.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DmParticipantRow"
    description: {zh: "会话与用户的成员关系及未读", en: "Membership of users in conversations with unread counts"}
    schema: {"type":"object","additionalProperties":false,"description":"会话与用户的成员关系及未读 / Membership of users in conversations with unread counts｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_dm_participant；主键 PK(id)；唯一约束 UNIQUE(conversationId,userId)；索引 INDEX(userId)；外键 FK(conversationId→data.message.dm-conversation.id, userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"conversationId":{"type":"string","description":"外键指向 data.message.dm-conversation.id（多对一，由 RDS 实施） / Foreign key to data.message.dm-conversation.id (many-to-one, enforced by RDS)"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"unreadCount":{"type":"integer","description":"unreadCount 字段 / Field unreadCount"},"joinedAt":{"type":"string","format":"date-time","description":"joinedAt 字段 / Field joinedAt"}},"required":["id","conversationId","userId","unreadCount","joinedAt"]}
deps:
  - kind: reference
    to: data.message.dm-conversation
    label: {zh: "conversationId→dm-conversation", en: "conversationId->dm-conversatio"}
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
