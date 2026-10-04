---
uid: 8870bc9e
id: bili.infra.migration.content-extra
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "内容获取与生态频道迁移", en: "Acquisition and channel migrations"}
description:
  zh: >
      acquire_source, acquire_license_evidence, channel_article, channel_goods 等
  en: >
      acquire_source, acquire_license_evidence, channel_article, channel_goods
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/0001_init.sql"
  - path: "migrations/content-extra/models/acquire_job.model.sql"
  - path: "migrations/content-extra/models/acquire_source.model.sql"
  - path: "migrations/content-extra/models/dedupe_record.model.sql"
  - path: "migrations/content-extra/models/import_record.model.sql"
  - path: "migrations/content-extra/models/license_evidence.model.sql"
  - path: "migrations/content-extra/models/provenance_record.model.sql"
  - path: "migrations/content-extra/models/album.model.sql"
  - path: "migrations/content-extra/models/article.model.sql"
  - path: "migrations/content-extra/models/article_revision.model.sql"
  - path: "migrations/content-extra/models/audio_publish.model.sql"
  - path: "migrations/content-extra/models/dressup_item.model.sql"
  - path: "migrations/content-extra/models/dressup_ownership.model.sql"
  - path: "migrations/content-extra/models/esports_match.model.sql"
  - path: "migrations/content-extra/models/mall_goods.model.sql"
  - path: "migrations/content-extra/models/manga.model.sql"
  - path: "migrations/content-extra/models/manga_chapter.model.sql"
  - path: "migrations/content-extra/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.content_extra_migration"
    description:
      zh: >
          获取与生态频道迁移脚本
      en: >
          Acquisition and channel migration scripts
types:
  - name: "MigrationStep"
    description: {zh: "迁移步骤", en: "Migration step"}
    schema: {"type":"object","description":"迁移步骤 / Migration step","additionalProperties":false,"properties":{"migrationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 migrationId（语义见对应领域契约） / Field migrationId"},"tableName":{"type":"string","minLength":1,"description":"权威 RDS 表名 / Authoritative RDS table"},"direction":{"type":"string","enum":["up","down"],"description":"借贷方向 / Debit or credit"},"appliedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 appliedAt（语义见对应领域契约） / Field appliedAt"}},"required":["migrationId","tableName","direction"]}
deps:
  - kind: reference
    to: bili.infra.db
    label: {zh: "迁移由 RDS 访问层执行", en: "Migrations executed by the RDS"}
---
