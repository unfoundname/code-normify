---
uid: 21071fc9
id: bili.community.moderation
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "评论管理与精选", en: "Comment moderation and highlights"}
description:
  zh: >
      UP 主置顶、精选、删除、关闭评论区与黑名单
  en: >
      Uploader pinning, selection, deletion, comment-close and blocklist
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/moderation/src/moderation.ts"
  - path: "services/community/moderation/tests/moderation.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/community/comment-moderation"
    description:
      zh: >
          执行评论管理动作
      en: >
          Apply a comment moderation action
    input: {module: "bili.community.moderation", name: "CommentModerationRequest"}
types:
  - name: "CommentModerationRequest"
    description: {zh: "评论管理请求", en: "Comment moderation request"}
    schema: {"type":"object","description":"评论管理请求 / Comment moderation request","additionalProperties":false,"properties":{"commentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"评论 ID / Comment id"},"action":{"type":"string","enum":["PIN","SELECT","DELETE","CLOSE_SECTION","BLOCK_SENDER"],"description":"字段 action（语义见对应领域契约） / Field action"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["commentId","action","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "校验稿件归属与 UP 主身份", en: "Verify video ownership and"}
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
