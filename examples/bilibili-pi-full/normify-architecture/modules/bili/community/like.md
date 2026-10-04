---
uid: 1fc99132
id: bili.community.like
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "点赞", en: "Likes"}
description:
  zh: >
      点赞/取消、计数、批量查询与互动统计视图
  en: >
      Like and unlike, counters, batch queries and the interaction stats view
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/like/src/like.ts"
  - path: "services/community/like/tests/like.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/community/likes"
    description:
      zh: >
          点赞或取消点赞
      en: >
          Like or unlike
    input: {module: "bili.community.like", name: "LikeToggleRequest"}
    output: {module: "bili.community.like", name: "InteractionStats"}
  - protocol: http
    method: GET
    path: "/api/v1/community/interaction-stats"
    description:
      zh: >
          批量查询互动统计
      en: >
          Batch interaction stats
    output: {module: "bili.community.like", name: "InteractionStats"}
types:
  - name: "InteractionStats"
    description: {zh: "互动统计", en: "Interaction stats"}
    schema: {"type":"object","description":"互动统计 / Interaction stats","additionalProperties":false,"properties":{"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","enum":["VIDEO","ARTICLE","AUDIO","DYNAMIC","COMMENT"],"description":"目标对象类型 / Target object type"},"likeCount":{"type":"integer","description":"点赞数 / Like count"},"coinCount":{"type":"integer","description":"投币数 / Coin count"},"favoriteCount":{"type":"integer","description":"收藏数 / Favorite count"},"shareCount":{"type":"integer","description":"字段 shareCount（语义见对应领域契约） / Field shareCount"},"replyCount":{"type":"integer","description":"评论数 / Reply count"}},"required":["targetId","targetType","likeCount","coinCount","favoriteCount","shareCount","replyCount"]}
  - name: "LikeToggleRequest"
    description: {zh: "点赞开关请求", en: "Like toggle request"}
    schema: {"type":"object","description":"点赞开关请求 / Like toggle request","additionalProperties":false,"properties":{"targetId":{"type":"string","minLength":1,"description":"目标对象 ID / Target object id"},"targetType":{"type":"string","minLength":1,"description":"目标对象类型 / Target object type"},"liked":{"type":"boolean","description":"字段 liked（语义见对应领域契约） / Field liked"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["targetId","targetType","liked","idempotencyKey","requestContext"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "点赞事件驱动动态与推荐反馈", en: "Like events feed dynamics and"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
