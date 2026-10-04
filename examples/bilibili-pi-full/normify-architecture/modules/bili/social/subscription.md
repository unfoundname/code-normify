---
uid: af167e2c
id: bili.social.subscription
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "合集与剧集订阅", en: "Collection and series subscription"}
description:
  zh: >
      订阅合集/剧集、更新提醒与订阅列表
  en: >
      Subscribe to collections and series, update reminders and subscription lists
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/subscription/src/subscription.ts"
  - path: "services/social/subscription/tests/subscription.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/social/subscriptions"
    description:
      zh: >
          订阅合集
      en: >
          Subscribe to a collection
    input: {module: "bili.social.subscription", name: "SubscriptionRequest"}
    output: {module: "bili.social.subscription", name: "Subscription"}
  - protocol: http
    method: GET
    path: "/api/v1/social/subscriptions"
    description:
      zh: >
          订阅列表
      en: >
          List subscriptions
    output: {module: "bili.social.subscription", name: "SubscriptionPage"}
types:
  - name: "Subscription"
    description: {zh: "订阅关系", en: "Subscription"}
    schema: {"type":"object","description":"订阅关系 / Subscription","additionalProperties":false,"properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subscriptionId（语义见对应领域契约） / Field subscriptionId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"notifyNewEpisode":{"type":"boolean","description":"字段 notifyNewEpisode（语义见对应领域契约） / Field notifyNewEpisode"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["subscriptionId","userId","seasonId","notifyNewEpisode","createdAt"]}
  - name: "SubscriptionPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.social.subscription:Subscription"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "SubscriptionRequest"
    description: {zh: "订阅关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Subscription write request carrying only client-provided fields"}
    schema: {"type":"object","description":"订阅关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Subscription write request carrying only client-provided fields","additionalProperties":false,"properties":{"subscriptionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subscriptionId（语义见对应领域契约） / Field subscriptionId"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"notifyNewEpisode":{"type":"boolean","description":"字段 notifyNewEpisode（语义见对应领域契约） / Field notifyNewEpisode"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["subscriptionId","seasonId","notifyNewEpisode","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.pgc.series
    label: {zh: "剧集更新事件", en: "Episode update events"}
  - kind: call
    to: bili.message.notify
    label: {zh: "更新提醒", en: "Update reminders"}
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
