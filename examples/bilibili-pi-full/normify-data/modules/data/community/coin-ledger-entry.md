---
uid: b7d618af
id: data.community.coin-ledger-entry
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "硬币账本分录", en: "Coin ledger entry"}
description:
  zh: >
      投币与每日硬币的仅追加分录（余额由分录派生）
  en: >
      Append-only entries for coins; balances are derived
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/coin_ledger_entry.model.sql"
apis:
  - protocol: rpc
    path: "db.table.coin_ledger_entry"
    description:
      zh: >
          权威表 coin_ledger_entry（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table coin_ledger_entry (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/coin_ledger_entry.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CoinLedgerEntryRow"
    description: {zh: "投币与每日硬币的仅追加分录（余额由分录派生）", en: "Append-only entries for coins; balances are derived"}
    schema: {"type":"object","additionalProperties":false,"description":"投币与每日硬币的仅追加分录（余额由分录派生） / Append-only entries for coins; balances are derived｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 coin_ledger_entry；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(userId,createdAt)；外键 FK(userId→data.identity.user.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"direction":{"type":"string","enum":["debit","credit"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"reason":{"type":"string","enum":["daily_login","task_reward","video_coin","refund","admin_adjust"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"balanceAfter":{"type":"integer","description":"balanceAfter 字段 / Field balanceAfter"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","direction","amount","reason","balanceAfter","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
