---
uid: 03b34796
id: bili.commerce.order
parent: bili.commerce
state: planned
tags: ["worker:cm-order"]
name: {zh: "订单、支付回调与退款", en: "Orders, Payment Callbacks and Refunds"}
description:
  zh: >
      订单状态机、支付渠道回调验签与幂等、超时关单、退款申请与执行；渠道未提供时标记 pending_decision。
      
  en: >
      Order state machine, signed idempotent payment callbacks, timeout closing, refunds; channel pending decision.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/order/src/order.ts"
  - path: "services/commerce/order/src/payment.ts"
  - path: "services/commerce/order/src/refund.ts"
  - path: "services/commerce/order/migrations/0001_order.sql"
  - path: "services/commerce/order/tests/order.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/orders"
    description:
      zh: >
          创建订单
          
      en: >
          Create order
          
    input: {module: "bili.commerce.order", name: "OrderRecord"}
    output: {module: "bili.commerce.order", name: "OrderRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/orders/{id}"
    description:
      zh: >
          查询订单
          
      en: >
          Get order
          
    output: {module: "bili.commerce.order", name: "OrderRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/payments/callbacks/{channel}"
    description:
      zh: >
          接收支付渠道回调（验签+幂等）
          
      en: >
          Receive payment callback
          
    input: {module: "bili.commerce.order", name: "PaymentCallback"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/refunds"
    description:
      zh: >
          申请退款
          
      en: >
          Request refund
          
    input: {module: "bili.commerce.order", name: "RefundRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "payment_callback"
    description:
      zh: >
          支付回调表（唯一写入所有者：订单服务）
          
      en: >
          payment_callback table
          
types:
  - name: "OrderRecord"
    description: {zh: "订单", en: "Order"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 `order`（保留字需按方言转义），唯一约束 idempotency_key","properties":{"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"productType":{"type":"string","enum":["membership","wallet_topup","guard","gift","course","charge","mall","dressup"],"description":"商品类型"},"productRef":{"type":"string","description":"商品引用"},"quantity":{"type":"integer","description":"数量","minimum":1},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"state":{"type":"string","enum":["created","pending_payment","paid","failed","cancelled","refunding","refunded","closed"],"description":"状态机"},"paymentMethod":{"type":"string","enum":["pending_decision","alipay","wechat","card","balance"],"description":"支付方式"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"paidAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expireAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["orderId","userId","productType","amount","state","createdAt"]}
  - name: "PaymentCallback"
    description: {zh: "支付回调", en: "Payment callback"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 payment_callback，唯一约束 channel+channel_trade_no 保证幂等","properties":{"callbackId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"channel":{"type":"string","description":"渠道"},"channelTradeNo":{"type":"string","description":"渠道交易号"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"signatureVerified":{"type":"boolean","description":"验签是否通过"},"state":{"type":"string","enum":["accepted","duplicate","amount_mismatch","signature_invalid","order_not_found"],"description":"处理结果"},"rawDigest":{"type":"string","description":"原始报文摘要（不落完整敏感报文）"},"receivedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["callbackId","orderId","channel","amount","signatureVerified","state"]}
  - name: "RefundRequest"
    description: {zh: "退款申请", en: "Refund request"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 refund_request","properties":{"refundId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"reason":{"type":"string","description":"原因","maxLength":300},"state":{"type":"string","enum":["requested","approved","rejected","processing","done","failed"],"description":"状态机"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"channelRefundNo":{"type":"string","description":"渠道退款单号"}},"required":["refundId","orderId","userId","amount","state","createdAt"]}
deps:
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "支付渠道待接入", en: "Payment gateway pending"}
  - kind: call
    to: bili.commerce.wallet
    from_api: "POST /api/v1/payments/callbacks/{channel}"
    to_api: "POST /internal/wallet/transactions"
    label: {zh: "支付成功入账钱包", en: "Credit wallet on payment"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "超时关单与对账任务", en: "Timeout close and reconcile jo"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "订单状态事件", en: "Order events"}
---
