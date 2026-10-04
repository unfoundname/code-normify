---
uid: 50ede794
id: bili.infra.migration.ops
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "运营与审核域迁移", en: "operations and audit migrations"}
description:
  zh: >
      本域 RDS 表、索引、唯一约束与外键的迁移脚本（方言实施前冻结）
  en: >
      Migrations for this domain tables, indexes, unique constraints and foreign keys, frozen before dialect selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/0001_init.sql"
  - path: "migrations/ops/models/danmaku_local_preference.model.sql"
  - path: "migrations/ops/models/ui_preference.model.sql"
  - path: "migrations/ops/models/creator_task.model.sql"
  - path: "migrations/ops/models/income_statement.model.sql"
  - path: "migrations/ops/models/task_claim.model.sql"
  - path: "migrations/ops/models/withdraw_request.model.sql"
  - path: "migrations/ops/models/behavior_feedback.model.sql"
  - path: "migrations/ops/models/home_slot_render.model.sql"
  - path: "migrations/ops/models/recommend_candidate.model.sql"
  - path: "migrations/ops/models/search_history.model.sql"
  - path: "migrations/ops/models/appeal_case.model.sql"
  - path: "migrations/ops/models/audit_decision.model.sql"
  - path: "migrations/ops/models/audit_task.model.sql"
  - path: "migrations/ops/models/campaign_config.model.sql"
  - path: "migrations/ops/models/copyright_complaint.model.sql"
  - path: "migrations/ops/models/operation_audit_log.model.sql"
  - path: "migrations/ops/models/penalty_record.model.sql"
  - path: "migrations/ops/models/report_ticket.model.sql"
  - path: "migrations/ops/models/service_ticket.model.sql"
  - path: "migrations/ops/models/slot_config.model.sql"
  - path: "migrations/ops/models/fan_overview.model.sql"
  - path: "migrations/ops/models/feed_timeline.model.sql"
  - path: "migrations/ops/models/hot_query.model.sql"
  - path: "migrations/ops/models/interaction_stat.model.sql"
  - path: "migrations/ops/models/rank_snapshot.model.sql"
  - path: "migrations/ops/models/search_document.model.sql"
  - path: "migrations/ops/models/unread_counter.model.sql"
  - path: "migrations/ops/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.ops_migration"
    description:
      zh: >
          本域迁移脚本与表清单（ops_audit_task, ops_report_ticket, ops_penalty_record 等）
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
