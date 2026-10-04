---
uid: f0be7ee9
id: data.commerce.refund-request
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "退款请求", en: "Refund request"}
description:
  zh: >
      退款金额、原因与状态
  en: >
      Refund amount, reason and state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/refund_request.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_refund_request"
    description:
      zh: >
          权威表 commerce_refund_request（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_refund_request (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/refund_request.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RefundRequestRow"
    description: {zh: "退款金额、原因与状态", en: "Refund amount, reason and state"}
    schema: {"type":"object","additionalProperties":false,"description":"退款金额、原因与状态 / Refund amount, reason and state｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_refund_request；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(orderId,status)；外键 FK(orderId→data.commerce.order.id, paymentIntentId→data.commerce.payment-intent.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"orderId":{"type":"string","description":"外键指向 data.commerce.order.id（多对一，由 RDS 实施） / Foreign key to data.commerce.order.id (many-to-one, enforced by RDS)"},"paymentIntentId":{"type":"string","description":"外键指向 data.commerce.payment-intent.id（多对一，由 RDS 实施） / Foreign key to data.commerce.payment-intent.id (many-to-one, enforced by RDS)"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"reason":{"type":"string","enum":["USER_REQUEST","DUPLICATE","FAILED_DELIVERY","POLICY"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"status":{"type":"string","enum":["REQUESTED","APPROVED","REFUNDED","REJECTED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","orderId","amount","reason","status","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.commerce.order
    label: {zh: "orderId→order.id，多对一", en: "orderId->order.id, many-to-one"}
  - kind: reference
    to: data.commerce.payment-intent
    label: {zh: "paymentIntentId→payment-intent", en: "paymentIntentId->payment-inten"}
---
