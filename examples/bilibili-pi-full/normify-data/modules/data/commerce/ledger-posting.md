---
uid: efab4391
id: data.commerce.ledger-posting
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "过账对", en: "Ledger posting"}
description:
  zh: >
      借贷成对关系与幂等键
  en: >
      Debit and credit pairing with an idempotency key
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/ledger_posting.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ledger_posting"
    description:
      zh: >
          权威表 ledger_posting（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table ledger_posting (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/ledger_posting.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LedgerPostingRow"
    description: {zh: "借贷成对关系与幂等键", en: "Debit and credit pairing with an idempotency key"}
    schema: {"type":"object","additionalProperties":false,"description":"借贷成对关系与幂等键 / Debit and credit pairing with an idempotency key｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 ledger_posting；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；无二级索引；外键 FK(debitEntryId→data.commerce.ledger-entry.id, creditEntryId→data.commerce.ledger-entry.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"debitEntryId":{"type":"string","description":"外键指向 data.commerce.ledger-entry.id（多对一，由 RDS 实施） / Foreign key to data.commerce.ledger-entry.id (many-to-one, enforced by RDS)"},"creditEntryId":{"type":"string","description":"外键指向 data.commerce.ledger-entry.id（多对一，由 RDS 实施） / Foreign key to data.commerce.ledger-entry.id (many-to-one, enforced by RDS)"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"}},"required":["id","debitEntryId","creditEntryId","amount","idempotencyKey"]}
deps:
  - kind: reference
    to: data.commerce.ledger-entry
    label: {zh: "debitEntryId→ledger-entry.id+c", en: "debitEntryId->ledger-entry.id+"}
---
