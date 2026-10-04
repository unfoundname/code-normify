---
uid: 0d79609b
id: data.commerce.order-item
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "订单条目", en: "Order item"}
description:
  zh: >
      订单商品明细与数量
  en: >
      Order line items and quantities
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/order_item.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_order_item"
    description:
      zh: >
          权威表 commerce_order_item（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_order_item (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/order_item.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "OrderItemRow"
    description: {zh: "订单商品明细与数量", en: "Order line items and quantities"}
    schema: {"type":"object","additionalProperties":false,"description":"订单商品明细与数量 / Order line items and quantities｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_order_item；主键 PK(id)；无唯一约束；索引 INDEX(orderId)；外键 FK(orderId→data.commerce.order.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"orderId":{"type":"string","description":"外键指向 data.commerce.order.id（多对一，由 RDS 实施） / Foreign key to data.commerce.order.id (many-to-one, enforced by RDS)"},"productId":{"type":"string","description":"productId 字段 / Field productId"},"quantity":{"type":"integer","description":"quantity 字段 / Field quantity"},"unitAmount":{"type":"integer","description":"unitAmount 字段 / Field unitAmount"}},"required":["id","orderId","productId","quantity","unitAmount"]}
deps:
  - kind: reference
    to: data.commerce.order
    label: {zh: "orderId→order.id，多对一", en: "orderId->order.id, many-to-one"}
---
