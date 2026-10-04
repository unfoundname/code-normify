---
uid: a5605114
id: data.message.dm-message
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "私信消息", en: "Direct message"}
description:
  zh: >
      消息内容、撤回与已读
  en: >
      Message content, recall and read state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/dm_message.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_dm_message"
    description:
      zh: >
          权威表 message_dm_message（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_dm_message (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/dm_message.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DmMessageRow"
    description: {zh: "消息内容、撤回与已读", en: "Message content, recall and read state"}
    schema: {"type":"object","additionalProperties":false,"description":"消息内容、撤回与已读 / Message content, recall and read state｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_dm_message；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(conversationId,createdAt)；外键 FK(conversationId→data.message.dm-conversation.id, senderId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"conversationId":{"type":"string","description":"外键指向 data.message.dm-conversation.id（多对一，由 RDS 实施） / Foreign key to data.message.dm-conversation.id (many-to-one, enforced by RDS)"},"senderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"content":{"type":"string","description":"content 字段 / Field content"},"mediaRefs":{"type":"array","items":{"type":"string"},"description":"mediaRefs 字段 / Field mediaRefs"},"recalled":{"type":"boolean","description":"recalled 字段 / Field recalled"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","conversationId","senderId","content","recalled","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.message.dm-conversation
    label: {zh: "conversationId→dm-conversation", en: "conversationId->dm-conversatio"}
  - kind: reference
    to: data.identity.user
    label: {zh: "senderId→user.id，多对一", en: "senderId->user.id, many-to-one"}
---
