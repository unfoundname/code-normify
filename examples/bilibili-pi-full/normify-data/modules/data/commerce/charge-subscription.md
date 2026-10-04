---
uid: 8aab6745
id: data.commerce.charge-subscription
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "充电订阅", en: "Charge subscription"}
description:
  zh: >
      订阅状态与下次扣费
  en: >
      Subscription state and next charge
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/charge_subscription.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_charge_subscription"
    description:
      zh: >
          权威表 commerce_charge_subscription（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_charge_subscription (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/charge_subscription.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ChargeSubscriptionRow"
    description: {zh: "订阅状态与下次扣费", en: "Subscription state and next charge"}
    schema: {"type":"object","additionalProperties":false,"description":"订阅状态与下次扣费 / Subscription state and next charge｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_charge_subscription；主键 PK(id)；唯一约束 UNIQUE(userId,planId)；无二级索引；外键 FK(userId→data.identity.user.id, planId→data.commerce.charge-plan.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"planId":{"type":"string","description":"外键指向 data.commerce.charge-plan.id（多对一，由 RDS 实施） / Foreign key to data.commerce.charge-plan.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["ACTIVE","EXPIRED","CANCELLED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"nextChargeAt":{"type":"string","format":"date-time","description":"nextChargeAt 字段 / Field nextChargeAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","planId","status","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.commerce.charge-plan
    label: {zh: "planId→charge-plan.id，多对一", en: "planId->charge-plan.id,"}
---
