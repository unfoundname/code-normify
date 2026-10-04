---
uid: 01fbdeb2
id: bili.client.web.features.commerce
parent: bili.client.web.features
state: planned
tags: ["worker:web-commerce"]
name: {zh: "会员交易前端", en: "Commerce Feature"}
description:
  zh: >
      大会员购买页与权益对比、钱包充值与流水、充电页、订单与退款状态、发票入口。
      
  en: >
      Membership purchase and benefit comparison, wallet top-up and ledger, charging, order/refund status.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/commerce/index.ts"
  - path: "apps/web/src/features/commerce/pages/MembershipPage.tsx"
  - path: "apps/web/src/features/commerce/pages/WalletPage.tsx"
  - path: "apps/web/src/features/commerce/tests/commerce.test.tsx"
apis: []
types:
  - name: "MembershipPageState"
    description: {zh: "会员页状态", en: "Membership page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"plans":{"type":"array","description":"套餐","items":{"$ref":"urn:normify:bili.commerce.membership:MembershipPlan"}},"mySubscription":{"$ref":"urn:normify:bili.commerce.membership:MembershipSubscription"},"benefits":{"type":"array","description":"权益","items":{"$ref":"urn:normify:bili.commerce.membership:MembershipBenefit"}},"autoRenewPrompt":{"type":"boolean","description":"是否提示自动续费"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["plans"]}
  - name: "OrderFlowState"
    description: {zh: "订单流程状态", en: "Order flow state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"order":{"$ref":"urn:normify:bili.commerce.order:OrderRecord"},"paymentMethod":{"type":"string","enum":["pending_decision","alipay","wechat","card","balance"],"description":"支付方式"},"polling":{"type":"boolean","description":"是否轮询支付结果"},"paidConfirmed":{"type":"boolean","description":"是否已确认支付"},"refund":{"$ref":"urn:normify:bili.commerce.order:RefundRequest"}},"required":["order","paidConfirmed"]}
deps:
  - kind: call
    to: bili.commerce.membership
    to_api: "GET /api/v1/membership/plans"
    label: {zh: "会员套餐与订阅", en: "Membership plans"}
  - kind: call
    to: bili.commerce.wallet
    to_api: "GET /api/v1/wallet/balance"
    label: {zh: "钱包与充值", en: "Wallet and top-up"}
  - kind: call
    to: bili.commerce.charge
    to_api: "POST /api/v1/charges"
    label: {zh: "充电与支持订阅", en: "Charging"}
  - kind: call
    to: bili.commerce.order
    to_api: "POST /api/v1/orders"
    label: {zh: "订单与退款", en: "Orders and refunds"}
---
