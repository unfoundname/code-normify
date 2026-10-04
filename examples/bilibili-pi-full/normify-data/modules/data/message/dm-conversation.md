---
uid: 5be80724
id: data.message.dm-conversation
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "私信会话", en: "Direct conversation"}
description:
  zh: >
      会话与最后消息时间
  en: >
      Conversations with last message time
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/dm_conversation.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_dm_conversation"
    description:
      zh: >
          权威表 message_dm_conversation（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_dm_conversation (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/dm_conversation.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DmConversationRow"
    description: {zh: "会话与最后消息时间", en: "Conversations with last message time"}
    schema: {"type":"object","additionalProperties":false,"description":"会话与最后消息时间 / Conversations with last message time｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_dm_conversation；主键 PK(id)；无唯一约束；索引 INDEX(lastMessageAt)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"kind":{"type":"string","enum":["ONE_TO_ONE","GROUP"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"lastMessageAt":{"type":"string","format":"date-time","description":"lastMessageAt 字段 / Field lastMessageAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","kind","lastMessageAt","createdAt"]}
---
