---
uid: d9435a9e
id: bili.commerce.charge
parent: bili.commerce
state: planned
tags: ["worker:cm-charge"]
name: {zh: "充电与支持订阅", en: "Charging and Support Subscriptions"}
description:
  zh: >
      UP 主充电档位、单次充电、月度支持订阅、匿名支持与感谢消息；分成按结算规则入账。
      
  en: >
      Creator charge tiers, one-off charging, monthly support subscriptions, anonymous support and thanks.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/charge/src/plan.ts"
  - path: "services/commerce/charge/src/record.ts"
  - path: "services/commerce/charge/migrations/0001_charge.sql"
  - path: "services/commerce/charge/tests/charge.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/charges"
    description:
      zh: >
          单次充电
          
      en: >
          Charge once
          
    input: {module: "bili.commerce.charge", name: "ChargeRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/charge-subscriptions"
    description:
      zh: >
          开通月度支持订阅
          
      en: >
          Subscribe monthly support
          
    input: {module: "bili.commerce.charge", name: "ChargeSubscription"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/users/{userId}/charge-plans"
    description:
      zh: >
          读取 UP 主充电档位
          
      en: >
          Get charge plans
          
    output: {module: "bili.commerce.charge", name: "ChargePlan"}
  - protocol: mysql
    path: "charge_record"
    description:
      zh: >
          充电记录表（唯一写入所有者：充电服务）
          
      en: >
          charge_record table
          
types:
  - name: "ChargePlan"
    description: {zh: "充电档位", en: "Charge tier"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 charge_plan","properties":{"planId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"档位标题","maxLength":40},"description":{"type":"string","description":"说明","maxLength":300},"tiers":{"type":"array","description":"金额档位","items":{"type":"object","additionalProperties":false,"properties":{"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"benefits":{"type":"array","description":"权益说明","items":{"type":"string","description":"说明"}}},"required":["amount"]}},"monthly":{"type":"boolean","description":"是否支持月度订阅"},"state":{"type":"string","enum":["active","paused","closed"],"description":"状态"}},"required":["planId","ownerId","tiers","state"]}
  - name: "ChargeRecord"
    description: {zh: "充电记录", en: "Charge record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 charge_record；资金流向由账本分录保证","properties":{"chargeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"message":{"type":"string","description":"留言","maxLength":200},"anonymous":{"type":"boolean","description":"是否匿名"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ledgerTransferId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["chargeId","userId","ownerId","amount","orderId","createdAt"]}
  - name: "ChargeSubscription"
    description: {zh: "充电支持订阅", en: "Charge subscription"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 charge_subscription","properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tierAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"state":{"type":"string","enum":["active","paused","cancelled","failed"],"description":"状态机"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"nextChargeAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"totalCharged":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"failures":{"type":"integer","description":"扣款失败次数","minimum":0}},"required":["subscriptionId","userId","ownerId","tierAmount","state","nextChargeAt"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/charges"
    to_api: "POST /api/v1/orders"
    label: {zh: "充电生成订单并等待支付", en: "Charge via order"}
  - kind: call
    to: bili.commerce.wallet
    label: {zh: "余额扣款", en: "Debit wallet"}
  - kind: reference
    to: bili.data.ledger
    label: {zh: "分成入账走账本", en: "Shares via ledger"}
  - kind: call
    to: bili.social.message
    label: {zh: "感谢与到账通知", en: "Thank-you notifications"}
---
