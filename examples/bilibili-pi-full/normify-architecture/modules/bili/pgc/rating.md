---
uid: 1f53b4b1
id: bili.pgc.rating
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "评分与点评", en: "Ratings and reviews"}
description:
  zh: >
      评分、长评、评分聚合与防刷
  en: >
      Ratings, long reviews, score aggregation and anti-brushing
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/rating/src/rating.ts"
  - path: "services/pgc/rating/tests/rating.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/pgc/ratings"
    description:
      zh: >
          提交评分
      en: >
          Submit a rating
    input: {module: "bili.pgc.rating", name: "SeasonRatingRequest"}
    output: {module: "bili.pgc.rating", name: "SeasonRating"}
  - protocol: http
    method: GET
    path: "/api/v1/pgc/ratings/"
    description:
      zh: >
          评分与长评
      en: >
          Ratings and reviews
    output: {module: "bili.pgc.rating", name: "RatingPage"}
types:
  - name: "SeasonRating"
    description: {zh: "季度评分", en: "Season rating"}
    schema: {"type":"object","description":"季度评分 / Season rating","additionalProperties":false,"properties":{"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"score":{"type":"integer","description":"评分 / Rating score"},"reviewId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reviewId（语义见对应领域契约） / Field reviewId"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["seasonId","userId","score","createdAt"]}
  - name: "RatingPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.pgc.rating:SeasonRating"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "SeasonRatingRequest"
    description: {zh: "季度评分写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Season rating write request carrying only client-provided fields"}
    schema: {"type":"object","description":"季度评分写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Season rating write request carrying only client-provided fields","additionalProperties":false,"properties":{"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"score":{"type":"integer","description":"评分 / Rating score"},"reviewId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reviewId（语义见对应领域契约） / Field reviewId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["seasonId","score","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.security
    label: {zh: "防刷与异常评分识别", en: "Anti-brushing and anomaly"}
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
