---
uid: 9926df4b
id: data.channel.dressup-item
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "装扮项", en: "Dress-up item"}
description:
  zh: >
      装扮类型与资源引用
  en: >
      Dress-up kinds and asset references
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/dressup_item.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_dressup_item"
    description:
      zh: >
          权威表 channel_dressup_item（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_dressup_item (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/dressup_item.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DressupItemRow"
    description: {zh: "装扮类型与资源引用", en: "Dress-up kinds and asset references"}
    schema: {"type":"object","additionalProperties":false,"description":"装扮类型与资源引用 / Dress-up kinds and asset references｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_dressup_item；主键 PK(id)；无唯一约束；索引 INDEX(kind,active)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"kind":{"type":"string","enum":["CARD","SPACE","BADGE","THEME"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"name":{"type":"string","description":"name 字段 / Field name"},"assetObjectKey":{"type":"string","description":"assetObjectKey 字段 / Field assetObjectKey"},"priceAmount":{"type":"integer","description":"priceAmount 字段 / Field priceAmount"},"active":{"type":"boolean","description":"active 字段 / Field active"}},"required":["id","kind","name","assetObjectKey","active"]}
---
