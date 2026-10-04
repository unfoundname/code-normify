---
uid: 521e920d
id: bili.commerce.order
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "订单", en: "Orders"}
description:
  zh: >
      订单创建、状态机、超时关闭与订单查询
  en: >
      Order creation, state machine, timeout closing and queries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/order/src/order.ts"
  - path: "services/commerce/order/tests/order.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/commerce/orders"
    description:
      zh: >
          创建订单
      en: >
          Create an order
    input: {module: "bili.commerce.order", name: "CreateOrderRequest"}
    output: {module: "bili.commerce.order", name: "OrderView"}
  - protocol: http
    method: GET
    path: "/api/v1/commerce/orders/:orderId"
    description:
      zh: >
          按订单号查询订单（路径参数与类型化 input 一致）
      en: >
          Get an order by path parameter and typed input
    input: {module: "bili.commerce.order", name: "OrderQueryRequest"}
    output: {module: "bili.commerce.order", name: "OrderView"}
types:
  - name: "OrderView"
    description: {zh: "订单视图", en: "Order view"}
    schema: {"type":"object","description":"订单视图 / Order view","additionalProperties":false,"properties":{"orderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"订单 ID / Order id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"buyer":{"$ref":"urn:normify:bili.identity.profile:ProfileView","description":"字段 buyer（语义见对应领域契约） / Field buyer"},"productType":{"type":"string","enum":["VIP","COIN","BATTERY","GOODS","CHARGE","COURSE"],"description":"字段 productType（语义见对应领域契约） / Field productType"},"productId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 productId（语义见对应领域契约） / Field productId"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"status":{"type":"string","enum":["CREATED","PAID","CLOSED","REFUNDING","REFUNDED","FAILED"],"description":"状态 / Status"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["orderId","userId","buyer","productType","productId","amount","status","createdAt"]}
  - name: "CreateOrderRequest"
    description: {zh: "创建订单请求", en: "Create order request"}
    schema: {"type":"object","description":"创建订单请求 / Create order request","additionalProperties":false,"properties":{"productType":{"type":"string","enum":["VIP","COIN","BATTERY","GOODS","CHARGE","COURSE"],"description":"字段 productType（语义见对应领域契约） / Field productType"},"productId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 productId（语义见对应领域契约） / Field productId"},"quantity":{"type":"integer","description":"字段 quantity（语义见对应领域契约） / Field quantity"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["productType","productId","quantity","idempotencyKey","requestContext"]}
  - name: "OrderPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.commerce.order:OrderView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "OrderQueryRequest"
    description: {zh: "订单查询请求", en: "Order query request"}
    schema: {"type":"object","description":"订单查询请求 / Order query request","additionalProperties":false,"properties":{"orderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"订单 ID / Order id"}},"required":["orderId"]}
deps:
  - kind: call
    to: bili.commerce.payment
    from_api: "POST /api/v1/commerce/orders"
    to_api: "POST /api/v1/commerce/payment-intents"
    label: {zh: "发起支付", en: "Initiate payment"}
  - kind: event
    to: bili.commerce.payment
    label: {zh: "消费支付成功事件推进订单", en: "Consume payment events to"}
  - kind: reference
    to: bili.identity.profile
    label: {zh: "订单展示买家资料", en: "Buyer profile for order"}
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
