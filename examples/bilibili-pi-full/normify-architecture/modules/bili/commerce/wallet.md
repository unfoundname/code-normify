---
uid: c7273c4c
id: bili.commerce.wallet
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "钱包与充值", en: "Wallet and top-up"}
description:
  zh: >
      B 币/电池余额、充值下单、冻结与解冻
  en: >
      B-coin and battery balance, top-up orders, freeze and unfreeze
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/wallet/src/wallet.ts"
  - path: "services/commerce/wallet/tests/wallet.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/commerce/wallet"
    description:
      zh: >
          查询钱包
      en: >
          Get the wallet
    output: {module: "bili.commerce.wallet", name: "WalletView"}
  - protocol: http
    method: POST
    path: "/api/v1/commerce/topups"
    description:
      zh: >
          创建充值订单
      en: >
          Create a top-up order
    input: {module: "bili.commerce.wallet", name: "TopupRequest"}
    output: {module: "bili.commerce.order", name: "OrderView"}
types:
  - name: "WalletView"
    description: {zh: "钱包视图", en: "Wallet view"}
    schema: {"type":"object","description":"钱包视图 / Wallet view","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"balances":{"type":"array","items":{"$ref":"urn:normify:bili.commerce.wallet:WalletBalance"},"description":"字段 balances（语义见对应领域契约） / Field balances"},"frozen":{"type":"array","items":{"$ref":"urn:normify:bili.commerce.wallet:WalletBalance"},"description":"字段 frozen（语义见对应领域契约） / Field frozen"}},"required":["userId","balances","frozen"]}
  - name: "WalletBalance"
    description: {zh: "钱包余额项", en: "Wallet balance item"}
    schema: {"type":"object","description":"钱包余额项 / Wallet balance item","additionalProperties":false,"properties":{"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"货币代码 / Currency code"},"balance":{"$ref":"urn:normify:bili.contract.common:Money","description":"可用余额（最小货币单位整数） / Balance in minor units"}},"required":["currency","balance"]}
  - name: "TopupRequest"
    description: {zh: "充值请求", en: "Top-up request"}
    schema: {"type":"object","description":"充值请求 / Top-up request","additionalProperties":false,"properties":{"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"货币代码 / Currency code"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"推送通道 / Push channel"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["currency","amount","channel","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "余额派生自账本分录", en: "Balances are derived from"}
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
