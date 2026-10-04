---
uid: 1b3a8e80
id: data.commerce.ledger-account
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "账本账户", en: "Ledger account"}
description:
  zh: >
      复式记账账户与币种
  en: >
      Double-entry accounts and currencies
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/ledger_account.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ledger_account"
    description:
      zh: >
          权威表 ledger_account（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table ledger_account (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/ledger_account.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LedgerAccountRow"
    description: {zh: "复式记账账户与币种", en: "Double-entry accounts and currencies"}
    schema: {"type":"object","additionalProperties":false,"description":"复式记账账户与币种 / Double-entry accounts and currencies｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 ledger_account；主键 PK(id)；唯一约束 UNIQUE(ownerId,accountType,currency)；无二级索引；外键 FK(ownerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"accountType":{"type":"string","enum":["USER_AVAILABLE","USER_FROZEN","PLATFORM_REVENUE","PLATFORM_COST","CREATOR_PAYABLE","ESCROW"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"balance":{"type":"integer","description":"balance 字段 / Field balance"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","accountType","currency","balance","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
---
