---
uid: 5a0dd1b0
id: data.channel.mall-goods
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "会员购商品", en: "Mall goods"}
description:
  zh: >
      商品、价格与库存
  en: >
      Goods, prices and stock
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/mall_goods.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_mall_goods"
    description:
      zh: >
          权威表 channel_mall_goods（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_mall_goods (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/mall_goods.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MallGoodsRow"
    description: {zh: "商品、价格与库存", en: "Goods, prices and stock"}
    schema: {"type":"object","additionalProperties":false,"description":"商品、价格与库存 / Goods, prices and stock｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_mall_goods；主键 PK(id)；无唯一约束；索引 INDEX(onSale,kind)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"kind":{"type":"string","enum":["TICKET","GOODS","DIGITAL","DRESS_UP"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"priceAmount":{"type":"integer","description":"priceAmount 字段 / Field priceAmount"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"stock":{"type":"integer","description":"stock 字段 / Field stock"},"onSale":{"type":"boolean","description":"onSale 字段 / Field onSale"}},"required":["id","title","kind","priceAmount","currency","stock","onSale"]}
---
