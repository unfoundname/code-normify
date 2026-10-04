---
uid: 81967e5c
id: bili.infra.migration.identity
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "身份与权限域迁移", en: "identity and authorization migrations"}
description:
  zh: >
      本域 RDS 表、索引、唯一约束与外键的迁移脚本（方言实施前冻结）
  en: >
      Migrations for this domain tables, indexes, unique constraints and foreign keys, frozen before dialect selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/0001_init.sql"
  - path: "migrations/identity/models/block_relation.model.sql"
  - path: "migrations/identity/models/credential.model.sql"
  - path: "migrations/identity/models/deletion_request.model.sql"
  - path: "migrations/identity/models/level_profile.model.sql"
  - path: "migrations/identity/models/login_attempt.model.sql"
  - path: "migrations/identity/models/privacy_setting.model.sql"
  - path: "migrations/identity/models/profile.model.sql"
  - path: "migrations/identity/models/realname_profile.model.sql"
  - path: "migrations/identity/models/role_grant.model.sql"
  - path: "migrations/identity/models/session.model.sql"
  - path: "migrations/identity/models/user.model.sql"
  - path: "migrations/identity/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.identity_migration"
    description:
      zh: >
          本域迁移脚本与表清单（identity_user, identity_role_grant, identity_realname_profile 等）
      en: >
          Domain migration scripts (RDS dialect pending) (RDS dialect pending) (RDS dialect pending) (RDS dialect pending) (RDS dialect pending) (RDS dialect pending) (RDS dialect pending) (RDS dialect pending)
types:
  - name: "MigrationStep"
    description: {zh: "迁移步骤", en: "Migration step"}
    schema: {"type":"object","description":"迁移步骤 / Migration step","additionalProperties":false,"properties":{"migrationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 migrationId（语义见对应领域契约） / Field migrationId"},"tableName":{"type":"string","minLength":1,"description":"权威 RDS 表名 / Authoritative RDS table"},"direction":{"type":"string","enum":["up","down"],"description":"借贷方向 / Debit or credit"},"appliedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 appliedAt（语义见对应领域契约） / Field appliedAt"}},"required":["migrationId","tableName","direction"]}
deps:
  - kind: reference
    to: bili.infra.db
    label: {zh: "迁移由 RDS 访问层执行", en: "Migrations executed by the RDS"}
---
