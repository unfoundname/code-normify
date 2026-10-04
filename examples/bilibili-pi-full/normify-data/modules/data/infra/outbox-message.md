---
uid: c70c0fe5
id: data.infra.outbox-message
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "Outbox 消息", en: "Outbox message"}
description:
  zh: >
      同事务写入的事件消息与投递状态
  en: >
      Event messages written in the same transaction with delivery state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/outbox_message.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_outbox_message"
    description:
      zh: >
          权威表 infra_outbox_message（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_outbox_message (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/outbox_message.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "OutboxMessageRow"
    description: {zh: "同事务写入的事件消息与投递状态", en: "Event messages written in the same transaction with delivery state"}
    schema: {"type":"object","additionalProperties":false,"description":"同事务写入的事件消息与投递状态 / Event messages written in the same transaction with delivery state｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_outbox_message；主键 PK(id)；唯一约束 UNIQUE(dedupeKey)；索引 INDEX(status,leaseUntil)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"topic":{"type":"string","description":"topic 字段 / Field topic"},"eventType":{"type":"string","description":"eventType 字段 / Field eventType"},"eventVersion":{"type":"integer","description":"eventVersion 字段 / Field eventVersion"},"producer":{"type":"string","description":"producer 字段 / Field producer"},"dedupeKey":{"type":"string","description":"dedupeKey 字段 / Field dedupeKey"},"payloadJson":{"type":"object","additionalProperties":true,"description":"payloadJson 字段 / Field payloadJson"},"attempt":{"type":"integer","description":"attempt 字段 / Field attempt"},"attemptLimit":{"type":"integer","description":"attemptLimit 字段 / Field attemptLimit"},"leaseUntil":{"type":"string","format":"date-time","description":"leaseUntil 字段 / Field leaseUntil"},"status":{"type":"string","enum":["PENDING","LEASED","PUBLISHED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","topic","eventType","eventVersion","producer","dedupeKey","payloadJson","attempt","attemptLimit","status","createdAt"]}
---
