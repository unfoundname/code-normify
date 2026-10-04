---
uid: c9f810db
id: data.media.media-job-lease
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "媒体任务租约", en: "Media job lease"}
description:
  zh: >
      任务租约、重试与死信标记（与 outbox 同语义）
  en: >
      Job leases, retries and dead letter markers sharing outbox semantics
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/media_job_lease.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_job_lease"
    description:
      zh: >
          权威表 media_job_lease（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_job_lease (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/media_job_lease.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MediaJobLeaseRow"
    description: {zh: "任务租约、重试与死信标记（与 outbox 同语义）", en: "Job leases, retries and dead letter markers sharing outbox semantics"}
    schema: {"type":"object","additionalProperties":false,"description":"任务租约、重试与死信标记（与 outbox 同语义） / Job leases, retries and dead letter markers sharing outbox semantics｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_job_lease；主键 PK(id)；无唯一约束；索引 INDEX(status,leaseUntil)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"jobType":{"type":"string","description":"jobType 字段 / Field jobType"},"payloadJson":{"type":"object","additionalProperties":true,"description":"payloadJson 字段 / Field payloadJson"},"attempt":{"type":"integer","description":"attempt 字段 / Field attempt"},"attemptLimit":{"type":"integer","description":"attemptLimit 字段 / Field attemptLimit"},"leaseUntil":{"type":"string","format":"date-time","description":"leaseUntil 字段 / Field leaseUntil"},"workerId":{"type":"string","description":"workerId 字段 / Field workerId"},"status":{"type":"string","enum":["PENDING","LEASED","PUBLISHED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","jobType","payloadJson","attempt","attemptLimit","status"]}
---
