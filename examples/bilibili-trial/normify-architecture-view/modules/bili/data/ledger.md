---
uid: ab854732
id: bili.data.ledger
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "账本表契约", en: "Ledger Table Contracts"}
description:
  zh: >
      B 币/电池/礼物/收益统一复式账本：账户、分录、转账、对账；只追加，余额由分录派生。
      
  en: >
      Double-entry ledger for coins, batteries, gifts and revenue: accounts, entries, transfers, reconciliation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/schema/ledger/ledger_account.sql"
  - path: "db/schema/ledger/ledger_entry.sql"
apis: []
types:
  - name: "LedgerAccountTable"
    description: {zh: "ledger_account 表", en: "ledger_account table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名 ledger_account"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"uniques":{"type":"array","description":"唯一约束：owner_id+currency+account_type","items":{"type":"string","description":"约束"}},"ownerModule":{"type":"string","description":"写入所有者：账本服务"}},"required":["table","columns","uniques","ownerModule"]}
  - name: "LedgerEntryTable"
    description: {zh: "ledger_entry 表（只追加）", en: "ledger_entry table"}
    schema: {"type":"object","additionalProperties":false,"description":"账本与订单/礼物/收益分表，禁止直接改余额列","properties":{"table":{"type":"string","description":"表名 ledger_entry"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"indexes":{"type":"array","description":"索引：account_id+created_at、transfer_id","items":{"type":"string","description":"索引"}},"immutable":{"type":"boolean","description":"是否只追加不可更新"},"balanceDerived":{"type":"boolean","description":"余额是否由分录派生而非直接写余额列"},"ownerModule":{"type":"string","description":"写入所有者：账本服务"}},"required":["table","columns","immutable","balanceDerived","ownerModule"]}
  - name: "ReconciliationTable"
    description: {zh: "reconciliation_batch 表", en: "reconciliation_batch table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名 reconciliation_batch"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"ownerModule":{"type":"string","description":"写入所有者：结算与对账服务"}},"required":["table","columns","ownerModule"]}
---
