---
uid: 739c2316
id: data.infra.backup-plan
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "备份计划", en: "Backup plan"}
description:
  zh: >
      目标、周期与 RPO/RTO
  en: >
      Targets, schedules and RPO/RTO
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/backup_plan.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_backup_plan"
    description:
      zh: >
          权威表 infra_backup_plan（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_backup_plan (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/backup_plan.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "BackupPlanRow"
    description: {zh: "目标、周期与 RPO/RTO", en: "Targets, schedules and RPO/RTO"}
    schema: {"type":"object","additionalProperties":false,"description":"目标、周期与 RPO/RTO / Targets, schedules and RPO/RTO｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_backup_plan；主键 PK(id)；无唯一约束；索引 INDEX(target)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"target":{"type":"string","enum":["RDS","OSS","SEARCH"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"schedule":{"type":"string","description":"schedule 字段 / Field schedule"},"retentionDays":{"type":"integer","description":"retentionDays 字段 / Field retentionDays"},"rpoMinutes":{"type":"integer","description":"rpoMinutes 字段 / Field rpoMinutes"},"rtoMinutes":{"type":"integer","description":"rtoMinutes 字段 / Field rtoMinutes"}},"required":["id","target","schedule","retentionDays","rpoMinutes","rtoMinutes"]}
---
