---
uid: a273b29d
id: bili.infra.migration.content
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "投稿与目录域迁移", en: "publishing and catalog migrations"}
description:
  zh: >
      本域 RDS 表、索引、唯一约束与外键的迁移脚本（方言实施前冻结）
  en: >
      Migrations for this domain tables, indexes, unique constraints and foreign keys, frozen before dialect selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/0001_init.sql"
  - path: "migrations/content/models/coauthor_invite.model.sql"
  - path: "migrations/content/models/collection.model.sql"
  - path: "migrations/content/models/collection_item.model.sql"
  - path: "migrations/content/models/draft_version.model.sql"
  - path: "migrations/content/models/partition.model.sql"
  - path: "migrations/content/models/publish_schedule.model.sql"
  - path: "migrations/content/models/publish_transition.model.sql"
  - path: "migrations/content/models/tag.model.sql"
  - path: "migrations/content/models/video.model.sql"
  - path: "migrations/content/models/video_audit_record.model.sql"
  - path: "migrations/content/models/video_draft.model.sql"
  - path: "migrations/content/models/video_part.model.sql"
  - path: "migrations/content/models/video_tag.model.sql"
  - path: "migrations/content/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.content_migration"
    description:
      zh: >
          本域迁移脚本与表清单（video_draft, video_part, catalog_video, catalog_taxonomy 等）
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
