---
uid: 2dc1a97d
id: bili.infra.migration.commerce
parent: bili.infra.migration
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "交易域迁移", en: "commerce migrations"}
description:
  zh: >
      本域 RDS 表、索引、唯一约束与外键的迁移脚本（方言实施前冻结）
  en: >
      Migrations for this domain tables, indexes, unique constraints and foreign keys, frozen before dialect selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/0001_init.sql"
  - path: "migrations/commerce/models/charge_plan.model.sql"
  - path: "migrations/commerce/models/charge_subscription.model.sql"
  - path: "migrations/commerce/models/entitlement.model.sql"
  - path: "migrations/commerce/models/ledger_account.model.sql"
  - path: "migrations/commerce/models/ledger_entry.model.sql"
  - path: "migrations/commerce/models/ledger_posting.model.sql"
  - path: "migrations/commerce/models/order.model.sql"
  - path: "migrations/commerce/models/order_item.model.sql"
  - path: "migrations/commerce/models/payment_intent.model.sql"
  - path: "migrations/commerce/models/reconcile_report.model.sql"
  - path: "migrations/commerce/models/refund_request.model.sql"
  - path: "migrations/commerce/models/vip_membership.model.sql"
  - path: "migrations/commerce/models/wallet_balance.model.sql"
  - path: "migrations/commerce/tests/migration.test.ts"
apis:
  - protocol: rpc
    path: "db.table.commerce_migration"
    description:
      zh: >
          本域迁移脚本与表清单（commerce_order, payment_intent, ledger_account, ledger_entry 等）
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
