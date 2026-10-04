---
uid: 72669b2d
id: bili.pgc.follow
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "追番追剧", en: "Following seasons"}
description:
  zh: >
      追番/追剧、更新提醒、追番列表与进度
  en: >
      Following seasons, update reminders, follow lists and progress
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/follow/src/follow.ts"
  - path: "services/pgc/follow/tests/follow.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/pgc/season-follows"
    description:
      zh: >
          追番
      en: >
          Follow a season
    input: {module: "bili.pgc.follow", name: "SeasonRequest"}
    output: {module: "bili.pgc.follow", name: "SeasonFollow"}
  - protocol: http
    method: GET
    path: "/api/v1/pgc/season-follows"
    description:
      zh: >
          追番列表
      en: >
          List followed seasons
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "SeasonFollow"
    description: {zh: "追番关系", en: "Season follow"}
    schema: {"type":"object","description":"追番关系 / Season follow","additionalProperties":false,"properties":{"followId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 followId（语义见对应领域契约） / Field followId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["followId","userId","seasonId","createdAt"]}
  - name: "SeasonRequest"
    description: {zh: "追番关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Season follow write request carrying only client-provided fields"}
    schema: {"type":"object","description":"追番关系写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Season follow write request carrying only client-provided fields","additionalProperties":false,"properties":{"followId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 followId（语义见对应领域契约） / Field followId"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["followId","seasonId","idempotencyKey","requestContext"]}
deps:
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
