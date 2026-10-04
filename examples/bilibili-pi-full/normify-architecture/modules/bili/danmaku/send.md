---
uid: b68b884b
id: bili.danmaku.send
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕发送", en: "Send danmaku"}
description:
  zh: >
      发送校验、频率限制、风控、去重与撤回
  en: >
      Send validation, rate limits, risk control, dedupe and retraction
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/send/src/send.ts"
  - path: "services/danmaku/send/tests/send.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/danmaku"
    description:
      zh: >
          发送弹幕
      en: >
          Send a danmaku
    input: {module: "bili.danmaku.send", name: "SendDanmakuRequest"}
    output: {module: "bili.danmaku.segment", name: "DanmakuItem"}
types:
  - name: "SendDanmakuRequest"
    description: {zh: "发送弹幕请求", en: "Send danmaku request"}
    schema: {"type":"object","description":"发送弹幕请求 / Send danmaku request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"positionMs":{"type":"integer","description":"时间点（毫秒） / Position in ms"},"text":{"type":"string","minLength":1,"description":"文本内容 / Text"},"mode":{"type":"string","enum":["SCROLL","TOP","BOTTOM","REVERSE"],"description":"字段 mode（语义见对应领域契约） / Field mode"},"color":{"type":"integer","description":"字段 color（语义见对应领域契约） / Field color"},"fontSize":{"type":"integer","description":"字段 fontSize（语义见对应领域契约） / Field fontSize"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","positionMs","text","mode","color","fontSize","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.security
    label: {zh: "发送风控与验证码", en: "Send risk control and captcha"}
  - kind: call
    to: bili.danmaku.preference
    label: {zh: "按发送者偏好与屏蔽过滤", en: "Filter by sender preferences"}
  - kind: call
    to: bili.ops.audit
    label: {zh: "命中词库的弹幕送审", en: "Send matched danmaku to audit"}
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
