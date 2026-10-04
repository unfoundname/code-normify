---
uid: b09e2704
id: bili.social.follow
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "关注与粉丝", en: "Follows and fans"}
description:
  zh: >
      关注/取关、粉丝列表、特别关注与关注上限
  en: >
      Follow and unfollow, fan lists, special follow and follow caps
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/follow/src/follow.ts"
  - path: "services/social/follow/tests/follow.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/social/follows"
    description:
      zh: >
          关注或取关
      en: >
          Follow or unfollow
    input: {module: "bili.social.follow", name: "FollowRequest"}
    output: {module: "bili.social.follow", name: "FollowRelation"}
  - protocol: http
    method: GET
    path: "/api/v1/social/follows/"
    description:
      zh: >
          关注或粉丝列表
      en: >
          Following or fan list
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "FollowRelation"
    description: {zh: "关注关系", en: "Follow relation"}
    schema: {"type":"object","description":"关注关系 / Follow relation","additionalProperties":false,"properties":{"followerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 followerId（语义见对应领域契约） / Field followerId"},"followedMid":{"type":"string","minLength":1,"description":"被关注用户业务号 / Followed user mid"},"relationType":{"type":"string","enum":["PUBLIC","SPECIAL","MUTUAL"],"description":"关系类型 / Relation type"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["followerId","followedMid","relationType","createdAt"]}
  - name: "FollowRequest"
    description: {zh: "关注关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Follow relation write request carrying only client-provided fields"}
    schema: {"type":"object","description":"关注关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Follow relation write request carrying only client-provided fields","additionalProperties":false,"properties":{"followerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 followerId（语义见对应领域契约） / Field followerId"},"followedMid":{"type":"string","minLength":1,"description":"被关注用户业务号 / Followed user mid"},"relationType":{"type":"string","enum":["PUBLIC","SPECIAL","MUTUAL"],"description":"关系类型 / Relation type"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["followerId","followedMid","relationType","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.message.notify
    label: {zh: "关注通知", en: "Follow notifications"}
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
