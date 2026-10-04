---
uid: e87f1693
id: bili.danmaku.report
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕举报", en: "Danmaku reports"}
description:
  zh: >
      举报分类、证据快照、处置联动与反馈
  en: >
      Report categories, evidence snapshots, handling linkage and feedback
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/report/src/report.ts"
  - path: "services/danmaku/report/tests/report.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/danmaku/reports"
    description:
      zh: >
          举报弹幕
      en: >
          Report a danmaku
    input: {module: "bili.danmaku.report", name: "DanmakuReportRequest"}
    output: {module: "bili.danmaku.report", name: "DanmakuReport"}
types:
  - name: "DanmakuReport"
    description: {zh: "弹幕举报", en: "Danmaku report"}
    schema: {"type":"object","description":"弹幕举报 / Danmaku report","additionalProperties":false,"properties":{"reportId":{"$ref":"urn:normify:bili.contract.common:Id","description":"举报 ID / Report id"},"danmakuId":{"$ref":"urn:normify:bili.contract.common:Id","description":"弹幕 ID / Danmaku id"},"reporterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reporterId（语义见对应领域契约） / Field reporterId"},"category":{"type":"string","enum":["SPAM","ABUSE","SPOILER","ILLEGAL","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"snapshotText":{"type":"string","minLength":1,"description":"字段 snapshotText（语义见对应领域契约） / Field snapshotText"},"status":{"type":"string","enum":["OPEN","ACCEPTED","REJECTED"],"description":"状态 / Status"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["reportId","danmakuId","reporterId","category","snapshotText","status","createdAt"]}
  - name: "DanmakuReportRequest"
    description: {zh: "弹幕举报写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Danmaku report write request carrying only client-provided fields"}
    schema: {"type":"object","description":"弹幕举报写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Danmaku report write request carrying only client-provided fields","additionalProperties":false,"properties":{"danmakuId":{"$ref":"urn:normify:bili.contract.common:Id","description":"弹幕 ID / Danmaku id"},"category":{"type":"string","enum":["SPAM","ABUSE","SPOILER","ILLEGAL","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"snapshotText":{"type":"string","minLength":1,"description":"字段 snapshotText（语义见对应领域契约） / Field snapshotText"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["danmakuId","category","snapshotText","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.ops.report
    label: {zh: "进入统一举报工单", en: "Enter the unified report"}
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
