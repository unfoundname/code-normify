---
uid: aacc53af
id: data.live.gift-transaction
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "礼物交易", en: "Gift transaction"}
description:
  zh: >
      送礼流水与账本分录引用
  en: >
      Gift flow records linked to ledger entries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/gift_transaction.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_gift_transaction"
    description:
      zh: >
          权威表 live_gift_transaction（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_gift_transaction (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/gift_transaction.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "GiftTransactionRow"
    description: {zh: "送礼流水与账本分录引用", en: "Gift flow records linked to ledger entries"}
    schema: {"type":"object","additionalProperties":false,"description":"送礼流水与账本分录引用 / Gift flow records linked to ledger entries｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_gift_transaction；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(roomId,createdAt)；外键 FK(senderId→data.identity.user.id, roomId→data.live.room.id, giftId→data.live.gift-catalog.id, ledgerEntryId→data.commerce.ledger-entry.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"senderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"giftId":{"type":"string","description":"外键指向 data.live.gift-catalog.id（多对一，由 RDS 实施） / Foreign key to data.live.gift-catalog.id (many-to-one, enforced by RDS)"},"giftCount":{"type":"integer","description":"giftCount 字段 / Field giftCount"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"ledgerEntryId":{"type":"string","description":"外键指向 data.commerce.ledger-entry.id（多对一，由 RDS 实施） / Foreign key to data.commerce.ledger-entry.id (many-to-one, enforced by RDS)"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","senderId","roomId","giftId","giftCount","amount","ledgerEntryId","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "senderId→user.id，多对一", en: "senderId->user.id, many-to-one"}
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
  - kind: reference
    to: data.live.gift-catalog
    label: {zh: "giftId→gift-catalog.id，多对一", en: "giftId->gift-catalog.id,"}
  - kind: reference
    to: data.commerce.ledger-entry
    label: {zh: "ledgerEntryId→ledger-entry.id，", en: "ledgerEntryId->ledger-entry.id"}
---
