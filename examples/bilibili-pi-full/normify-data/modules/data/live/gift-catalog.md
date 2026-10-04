---
uid: cfd6af80
id: data.live.gift-catalog
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "礼物目录", en: "Gift catalog"}
description:
  zh: >
      礼物与舰队档位、价格
  en: >
      Gifts and fleet tiers with prices
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/gift_catalog.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_gift_catalog"
    description:
      zh: >
          权威表 live_gift_catalog（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_gift_catalog (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/gift_catalog.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "GiftCatalogRow"
    description: {zh: "礼物与舰队档位、价格", en: "Gifts and fleet tiers with prices"}
    schema: {"type":"object","additionalProperties":false,"description":"礼物与舰队档位、价格 / Gifts and fleet tiers with prices｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_gift_catalog；主键 PK(id)；无唯一约束；索引 INDEX(kind,active)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"name":{"type":"string","description":"name 字段 / Field name"},"kind":{"type":"string","enum":["NORMAL","FLEET","SC_CHAT"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"priceAmount":{"type":"integer","description":"priceAmount 字段 / Field priceAmount"},"priceCurrency":{"type":"string","description":"priceCurrency 字段 / Field priceCurrency"},"fleetTier":{"type":"integer","description":"fleetTier 字段 / Field fleetTier"},"active":{"type":"boolean","description":"active 字段 / Field active"}},"required":["id","name","kind","priceAmount","priceCurrency","active"]}
---
