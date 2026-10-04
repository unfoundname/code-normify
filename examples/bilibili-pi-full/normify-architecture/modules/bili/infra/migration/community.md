---
uid: 8f931559
id: bili.infra.migration.community
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "社区与社交域迁移", en: "community and social migrations"}
description:
  zh: >
      本域 RDS 表、索引、唯一约束与外键的迁移脚本（方言实施前冻结）
  en: >
      Migrations for this domain tables, indexes, unique constraints and foreign keys, frozen before dialect selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/0001_init.sql"
  - path: "migrations/community/models/coin_ledger_entry.model.sql"
  - path: "migrations/community/models/comment.model.sql"
  - path: "migrations/community/models/favorite_folder.model.sql"
  - path: "migrations/community/models/favorite_item.model.sql"
  - path: "migrations/community/models/like_record.model.sql"
  - path: "migrations/community/models/share_record.model.sql"
  - path: "migrations/community/models/danmaku_item.model.sql"
  - path: "migrations/community/models/danmaku_moderation.model.sql"
  - path: "migrations/community/models/danmaku_preference.model.sql"
  - path: "migrations/community/models/danmaku_report.model.sql"
  - path: "migrations/community/models/danmaku_segment.model.sql"
  - path: "migrations/community/models/danmaku_style.model.sql"
  - path: "migrations/community/models/dynamic_media.model.sql"
  - path: "migrations/community/models/dynamic_post.model.sql"
  - path: "migrations/community/models/follow_group.model.sql"
  - path: "migrations/community/models/follow_group_member.model.sql"
  - path: "migrations/community/models/follow_relation.model.sql"
  - path: "migrations/community/models/mute_rule.model.sql"
  - path: "migrations/community/models/season_subscription.model.sql"
  - path: "migrations/community/models/topic.model.sql"
  - path: "migrations/community/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.community_migration"
    description:
      zh: >
          本域迁移脚本与表清单（community_comment, coin_ledger_entry, social_follow, social_dynamic 等）
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
