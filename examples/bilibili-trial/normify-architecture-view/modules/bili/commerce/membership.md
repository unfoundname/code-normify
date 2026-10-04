---
uid: ca491002
id: bili.commerce.membership
parent: bili.commerce
state: planned
tags: ["worker:cm-membership"]
name: {zh: "大会员与权益", en: "Membership"}
description:
  zh: >
      会员套餐、订阅状态机、权益清单与生效判定；权益判定为只读查询，不写他人表。
      
  en: >
      Plans, subscription state machine, benefit catalogue and effective checks as read-only queries.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/membership/src/plan.ts"
  - path: "services/commerce/membership/src/subscription.ts"
  - path: "services/commerce/membership/migrations/0001_membership.sql"
  - path: "services/commerce/membership/tests/membership.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/membership/plans"
    description:
      zh: >
          列出会员套餐
          
      en: >
          List plans
          
    output: {module: "bili.commerce.membership", name: "MembershipPlan"}
  - protocol: http
    method: POST
    path: "/api/v1/membership/subscriptions"
    description:
      zh: >
          开通会员（生成订单）
          
      en: >
          Subscribe membership
          
    input: {module: "bili.commerce.order", name: "OrderRecord"}
    output: {module: "bili.commerce.membership", name: "MembershipSubscription"}
  - protocol: http
    method: GET
    path: "/api/v1/membership/me"
    description:
      zh: >
          查询我的会员状态
          
      en: >
          Get membership status
          
    output: {module: "bili.commerce.membership", name: "MembershipSubscription"}
  - protocol: http
    method: POST
    path: "/internal/membership/entitlements/check"
    description:
      zh: >
          权益判定（供播放入口调用）
          
      en: >
          Check entitlement
          
    output: {module: "bili.contract.core.authz", name: "AccessDecision"}
  - protocol: mysql
    path: "membership_subscription"
    description:
      zh: >
          会员订阅表（唯一写入所有者：会员服务）
          
      en: >
          membership_subscription table
          
types:
  - name: "MembershipPlan"
    description: {zh: "会员套餐", en: "Membership plan"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 membership_plan","properties":{"planId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"套餐名","maxLength":40},"durationDays":{"type":"integer","description":"时长天数","minimum":1},"price":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"originalPrice":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"autoRenewAllowed":{"type":"boolean","description":"是否允许自动续费"},"benefits":{"type":"array","description":"权益码","items":{"type":"string","description":"权益码"}},"state":{"type":"string","enum":["on_sale","off_shelf","sold_out"],"description":"状态"},"sortIndex":{"type":"integer","description":"排序","minimum":0}},"required":["planId","name","durationDays","price","state"]}
  - name: "MembershipSubscription"
    description: {zh: "会员订阅", en: "Membership subscription"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 membership_subscription，唯一约束 user_id+active 唯一","properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"planId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["pending_payment","active","expired","cancelled","refunded"],"description":"状态机"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"autoRenew":{"type":"boolean","description":"是否自动续费"},"sourceOrderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"renewedCount":{"type":"integer","description":"已续费次数","minimum":0}},"required":["subscriptionId","userId","planId","state","startAt"]}
  - name: "MembershipBenefit"
    description: {zh: "会员权益", en: "Membership benefit"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 membership_benefit","properties":{"benefitCode":{"type":"string","description":"权益码","pattern":"^[a-z][a-z0-9_]{2,31}$"},"name":{"type":"string","description":"权益名"},"type":{"type":"string","enum":["quality","ad_free","exclusive_content","early_access","coupon","live_badge","storage"],"description":"类型"},"value":{"type":"string","description":"权益值"},"appliesTo":{"type":"array","description":"适用对象","items":{"type":"string","description":"对象类型"}}},"required":["benefitCode","name","type","value"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/membership/subscriptions"
    to_api: "POST /api/v1/orders"
    label: {zh: "开通与续费必须走订单", en: "Purchase via order"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "订阅事件驱动权益刷新", en: "Subscription events"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "资金类变更审计", en: "Audit money-like changes"}
---
