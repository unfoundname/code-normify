---
uid: 8d558a8c
id: data.infra.schema-migration
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "迁移记录", en: "Schema migration"}
description:
  zh: >
      已执行迁移与校验和
  en: >
      Applied migrations with checksums
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/schema_migration.model.sql"
apis:
  - protocol: rpc
    path: "db.table.schema_migration"
    description:
      zh: >
          权威表 schema_migration（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table schema_migration (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/schema_migration.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SchemaMigrationRow"
    description: {zh: "已执行迁移与校验和", en: "Applied migrations with checksums"}
    schema: {"type":"object","additionalProperties":false,"description":"已执行迁移与校验和 / Applied migrations with checksums｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 schema_migration；主键 PK(id)；唯一约束 UNIQUE(filename)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"domain":{"type":"string","description":"domain 字段 / Field domain"},"filename":{"type":"string","description":"filename 字段 / Field filename"},"checksum":{"type":"string","description":"checksum 字段 / Field checksum"},"appliedAt":{"type":"string","format":"date-time","description":"appliedAt 字段 / Field appliedAt"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"}},"required":["id","domain","filename","checksum","appliedAt","durationMs"]}
---
