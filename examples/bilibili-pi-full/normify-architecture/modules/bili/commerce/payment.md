---
uid: 784ea377
id: bili.commerce.payment
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "支付与回调", en: "Payment and callbacks"}
description:
  zh: >
      渠道下单、回调验签、幂等处理与支付事件
  en: >
      Channel payment intents, callback signature verification, idempotent handling and payment events
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/payment/src/payment.ts"
  - path: "services/commerce/payment/src/callback.ts"
  - path: "services/commerce/payment/tests/payment.test.ts"
  - path: "services/commerce/payment/tests/callback.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/commerce/payment-intents"
    description:
      zh: >
          发起支付
      en: >
          Create a payment intent
    input: {module: "bili.commerce.payment", name: "PaymentRequest"}
    output: {module: "bili.commerce.payment", name: "PaymentIntent"}
  - protocol: http
    method: POST
    path: "/api/v1/commerce/payment-callbacks"
    description:
      zh: >
          接收渠道回调（验签+幂等）
      en: >
          Receive a channel callback
    input: {module: "bili.commerce.payment", name: "PaymentCallbackRequest"}
types:
  - name: "PaymentIntent"
    description: {zh: "支付意图", en: "Payment intent"}
    schema: {"type":"object","description":"支付意图 / Payment intent","additionalProperties":false,"properties":{"intentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 intentId（语义见对应领域契约） / Field intentId"},"orderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"订单 ID / Order id"},"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"推送通道 / Push channel"},"channelTradeNo":{"type":"string","minLength":1,"description":"字段 channelTradeNo（语义见对应领域契约） / Field channelTradeNo"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"},"status":{"type":"string","enum":["PENDING","SUCCEEDED","FAILED","CLOSED"],"description":"状态 / Status"}},"required":["intentId","orderId","channel","expireAt","status"]}
  - name: "PaymentCallbackRequest"
    description: {zh: "支付渠道回调请求", en: "Payment channel callback"}
    schema: {"type":"object","description":"支付渠道回调请求 / Payment channel callback","additionalProperties":false,"properties":{"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"推送通道 / Push channel"},"channelTradeNo":{"type":"string","minLength":1,"description":"字段 channelTradeNo（语义见对应领域契约） / Field channelTradeNo"},"amountMoney":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 amountMoney（语义见对应领域契约） / Field amountMoney"},"signature":{"type":"string","minLength":1,"description":"个性签名 / Signature"},"rawPayloadJson":{"type":"string","minLength":1,"description":"字段 rawPayloadJson（语义见对应领域契约） / Field rawPayloadJson"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["channel","channelTradeNo","amountMoney","signature","rawPayloadJson","idempotencyKey","requestContext"]}
  - name: "PaymentRequest"
    description: {zh: "支付意图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Payment intent write request carrying only client-provided fields"}
    schema: {"type":"object","description":"支付意图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Payment intent write request carrying only client-provided fields","additionalProperties":false,"properties":{"intentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 intentId（语义见对应领域契约） / Field intentId"},"orderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"订单 ID / Order id"},"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"推送通道 / Push channel"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["intentId","orderId","channel","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.commerce.ledger
    from_api: "POST /api/v1/commerce/payment-callbacks"
    to_api: "rpc:commerce.ledger.post"
    label: {zh: "支付成功写入账本", en: "Write ledger entries on"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "发布支付成功事件供订单消费", en: "Publish a payment-succeeded"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
