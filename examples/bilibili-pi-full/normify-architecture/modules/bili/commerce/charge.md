---
uid: "29589515"
id: bili.commerce.charge
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "充电与支持订阅", en: "Charging and support subscriptions"}
description:
  zh: >
      为 UP 主充电、按月支持、权益与到期续费
  en: >
      Charging creators, monthly support, benefits and renewal
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/charge/src/charge.ts"
  - path: "services/commerce/charge/tests/charge.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/commerce/charge-subscriptions"
    description:
      zh: >
          创建或续费充电
      en: >
          Create or renew a charge subscription
    input: {module: "bili.commerce.charge", name: "ChargeRequest"}
    output: {module: "bili.commerce.charge", name: "ChargeSubscription"}
  - protocol: http
    method: GET
    path: "/api/v1/commerce/charge-plans/"
    description:
      zh: >
          充电方案列表
      en: >
          List charge plans
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "ChargePlan"
    description: {zh: "充电方案", en: "Charge plan"}
    schema: {"type":"object","description":"充电方案 / Charge plan","additionalProperties":false,"properties":{"planId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 planId（语义见对应领域契约） / Field planId"},"creatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creatorId（语义见对应领域契约） / Field creatorId"},"price":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 price（语义见对应领域契约） / Field price"},"period":{"type":"string","enum":["ONCE","MONTHLY","QUARTERLY"],"description":"字段 period（语义见对应领域契约） / Field period"},"benefits":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 benefits（语义见对应领域契约） / Field benefits"}},"required":["planId","creatorId","price","period","benefits"]}
  - name: "ChargeSubscription"
    description: {zh: "充电订阅", en: "Charge subscription"}
    schema: {"type":"object","description":"充电订阅 / Charge subscription","additionalProperties":false,"properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subscriptionId（语义见对应领域契约） / Field subscriptionId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"planId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 planId（语义见对应领域契约） / Field planId"},"status":{"type":"string","enum":["ACTIVE","EXPIRED","CANCELLED"],"description":"状态 / Status"},"nextChargeAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 nextChargeAt（语义见对应领域契约） / Field nextChargeAt"}},"required":["subscriptionId","userId","planId","status"]}
  - name: "ChargeRequest"
    description: {zh: "充电订阅写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Charge subscription write request carrying only client-provided fields"}
    schema: {"type":"object","description":"充电订阅写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Charge subscription write request carrying only client-provided fields","additionalProperties":false,"properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subscriptionId（语义见对应领域契约） / Field subscriptionId"},"planId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 planId（语义见对应领域契约） / Field planId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["subscriptionId","planId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.creator.income
    label: {zh: "充电收益计入创作者收益", en: "Charging revenue feeds creator"}
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
