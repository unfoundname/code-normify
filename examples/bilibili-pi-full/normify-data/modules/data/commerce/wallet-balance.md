---
uid: 4c10a97f
id: data.commerce.wallet-balance
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "钱包余额", en: "Wallet balance"}
description:
  zh: >
      按币种的余额快照（派生值，禁直接改）
  en: >
      Per-currency balance snapshot derived from the ledger
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/wallet_balance.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_wallet_balance"
    description:
      zh: >
          权威表 commerce_wallet_balance（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_wallet_balance (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/wallet_balance.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "WalletBalanceRow"
    description: {zh: "按币种的余额快照（派生值，禁直接改）", en: "Per-currency balance snapshot derived from the ledger"}
    schema: {"type":"object","additionalProperties":false,"description":"按币种的余额快照（派生值，禁直接改） / Per-currency balance snapshot derived from the ledger｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_wallet_balance；主键 PK(id)；唯一约束 UNIQUE(userId,currency)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"balance":{"type":"integer","description":"balance 字段 / Field balance"},"frozen":{"type":"integer","description":"frozen 字段 / Field frozen"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","currency","balance","frozen","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
