---
uid: 8272723b
id: data.commerce.ledger-entry
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "账本分录", en: "Ledger entry"}
description:
  zh: >
      仅追加分录，余额由分录派生
  en: >
      Append-only entries; balances are derived
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/ledger_entry.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ledger_entry"
    description:
      zh: >
          权威表 ledger_entry（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table ledger_entry (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/ledger_entry.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LedgerEntryRow"
    description: {zh: "仅追加分录，余额由分录派生", en: "Append-only entries; balances are derived"}
    schema: {"type":"object","additionalProperties":false,"description":"仅追加分录，余额由分录派生 / Append-only entries; balances are derived｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 ledger_entry；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(accountId,createdAt)；外键 FK(accountId→data.commerce.ledger-account.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"accountId":{"type":"string","description":"外键指向 data.commerce.ledger-account.id（多对一，由 RDS 实施） / Foreign key to data.commerce.ledger-account.id (many-to-one, enforced by RDS)"},"direction":{"type":"string","enum":["debit","credit"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"reason":{"type":"string","enum":["recharge","purchase","gift","coin","charge","refund","settle","adjust"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"balanceAfter":{"type":"integer","description":"balanceAfter 字段 / Field balanceAfter"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","accountId","direction","amount","currency","reason","targetId","balanceAfter","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.commerce.ledger-account
    label: {zh: "accountId→ledger-account.id，多对", en: "accountId->ledger-account.id,"}
---
