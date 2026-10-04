---
uid: 450fa0ab
id: data.commerce.order
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "订单", en: "Order"}
description:
  zh: >
      订单状态机与金额
  en: >
      Order state machine and amounts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/order.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_order"
    description:
      zh: >
          权威表 commerce_order（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_order (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/order.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "OrderRow"
    description: {zh: "订单状态机与金额", en: "Order state machine and amounts"}
    schema: {"type":"object","additionalProperties":false,"description":"订单状态机与金额 / Order state machine and amounts｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_order；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(userId,status), INDEX(createdAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"productType":{"type":"string","enum":["VIP","COIN","BATTERY","GOODS","CHARGE","COURSE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"status":{"type":"string","enum":["CREATED","PAID","CLOSED","REFUNDING","REFUNDED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"},"paidAt":{"type":"string","format":"date-time","description":"paidAt 字段 / Field paidAt"}},"required":["id","userId","productType","amount","currency","status","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
