---
uid: a4647ccf
id: data.commerce.charge-plan
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "充电方案", en: "Charge plan"}
description:
  zh: >
      UP 主充电方案与周期
  en: >
      Creator charge plans and periods
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/charge_plan.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_charge_plan"
    description:
      zh: >
          权威表 commerce_charge_plan（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_charge_plan (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/charge_plan.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ChargePlanRow"
    description: {zh: "UP 主充电方案与周期", en: "Creator charge plans and periods"}
    schema: {"type":"object","additionalProperties":false,"description":"UP 主充电方案与周期 / Creator charge plans and periods｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_charge_plan；主键 PK(id)；无唯一约束；索引 INDEX(creatorId,active)；外键 FK(creatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"creatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"price":{"type":"integer","description":"price 字段 / Field price"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"period":{"type":"string","enum":["ONCE","MONTHLY","QUARTERLY"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"benefits":{"type":"array","items":{"type":"string"},"description":"benefits 字段 / Field benefits"},"active":{"type":"boolean","description":"active 字段 / Field active"}},"required":["id","creatorId","price","currency","period","benefits","active"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "creatorId→user.id，多对一", en: "creatorId->user.id,"}
---
