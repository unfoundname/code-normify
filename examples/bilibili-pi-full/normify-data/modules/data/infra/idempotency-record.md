---
uid: c3ceeb5f
id: data.infra.idempotency-record
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "幂等记录", en: "Idempotency record"}
description:
  zh: >
      写操作幂等键与结果摘要
  en: >
      Write idempotency keys and result digests
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/idempotency_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_idempotency_record"
    description:
      zh: >
          权威表 infra_idempotency_record（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_idempotency_record (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/idempotency_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "IdempotencyRecordRow"
    description: {zh: "写操作幂等键与结果摘要", en: "Write idempotency keys and result digests"}
    schema: {"type":"object","additionalProperties":false,"description":"写操作幂等键与结果摘要 / Write idempotency keys and result digests｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_idempotency_record；主键 PK(id)；唯一约束 UNIQUE(module,idempotencyKey)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"module":{"type":"string","description":"module 字段 / Field module"},"requestHash":{"type":"string","description":"requestHash 字段 / Field requestHash"},"resultDigest":{"type":"string","description":"resultDigest 字段 / Field resultDigest"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","idempotencyKey","module","requestHash","resultDigest","expireAt","createdAt"]}
---
