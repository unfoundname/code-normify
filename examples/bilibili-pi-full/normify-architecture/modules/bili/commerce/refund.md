---
uid: "756e2617"
id: bili.commerce.refund
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "退款", en: "Refunds"}
description:
  zh: >
      退款申请、原路退回、部分退款与状态回写
  en: >
      Refund requests, original-channel refunds, partial refunds and state write-back
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/refund/src/refund.ts"
  - path: "services/commerce/refund/tests/refund.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/commerce/refunds"
    description:
      zh: >
          申请退款
      en: >
          Request a refund
    input: {module: "bili.commerce.refund", name: "RefundRequest"}
    output: {module: "bili.commerce.order", name: "OrderView"}
types:
  - name: "RefundRequest"
    description: {zh: "退款请求", en: "Refund request"}
    schema: {"type":"object","description":"退款请求 / Refund request","additionalProperties":false,"properties":{"orderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"订单 ID / Order id"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["orderId","amount","reason","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.commerce.payment
    label: {zh: "渠道退款调用", en: "Call the channel refund"}
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "退款冲正分录", en: "Reversal ledger entries"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
