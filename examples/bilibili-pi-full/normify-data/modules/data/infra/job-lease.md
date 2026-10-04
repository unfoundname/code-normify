---
uid: 3bef4f3c
id: data.infra.job-lease
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "任务租约", en: "Job lease"}
description:
  zh: >
      通用后台任务租约与重试
  en: >
      Generic background job leases and retries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/job_lease.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_job_lease"
    description:
      zh: >
          权威表 infra_job_lease（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_job_lease (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/job_lease.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "JobLeaseRow"
    description: {zh: "通用后台任务租约与重试", en: "Generic background job leases and retries"}
    schema: {"type":"object","additionalProperties":false,"description":"通用后台任务租约与重试 / Generic background job leases and retries｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_job_lease；主键 PK(id)；无唯一约束；索引 INDEX(jobType,status,leaseUntil)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"jobType":{"type":"string","description":"jobType 字段 / Field jobType"},"payloadJson":{"type":"object","additionalProperties":true,"description":"payloadJson 字段 / Field payloadJson"},"attempt":{"type":"integer","description":"attempt 字段 / Field attempt"},"attemptLimit":{"type":"integer","description":"attemptLimit 字段 / Field attemptLimit"},"leaseUntil":{"type":"string","format":"date-time","description":"leaseUntil 字段 / Field leaseUntil"},"workerId":{"type":"string","description":"workerId 字段 / Field workerId"},"status":{"type":"string","enum":["PENDING","LEASED","PUBLISHED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","jobType","payloadJson","attempt","attemptLimit","status"]}
---
