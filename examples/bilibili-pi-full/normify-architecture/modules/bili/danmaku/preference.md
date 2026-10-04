---
uid: cf822260
id: bili.danmaku.preference
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕偏好与屏蔽", en: "Danmaku preferences and blocking"}
description:
  zh: >
      屏蔽词/正则、类型屏蔽、用户屏蔽与偏好同步
  en: >
      Keyword and regex blocking, type blocking, user blocking and preference sync
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/preference/src/preference.ts"
  - path: "services/danmaku/preference/tests/preference.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/danmaku/preferences"
    description:
      zh: >
          更新弹幕偏好
      en: >
          Update danmaku preferences
    input: {module: "bili.danmaku.preference", name: "DanmakuRequest"}
    output: {module: "bili.danmaku.preference", name: "DanmakuPreference"}
types:
  - name: "DanmakuPreference"
    description: {zh: "弹幕偏好", en: "Danmaku preference"}
    schema: {"type":"object","description":"弹幕偏好 / Danmaku preference","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"blockedKeywords":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 blockedKeywords（语义见对应领域契约） / Field blockedKeywords"},"blockedRegex":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 blockedRegex（语义见对应领域契约） / Field blockedRegex"},"blockedTypes":{"type":"array","items":{"type":"string","enum":["SCROLL","TOP","BOTTOM","REVERSE"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 blockedTypes（语义见对应领域契约） / Field blockedTypes"},"blockedSenders":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 blockedSenders（语义见对应领域契约） / Field blockedSenders"}},"required":["userId","blockedKeywords","blockedRegex","blockedTypes","blockedSenders"]}
  - name: "DanmakuRequest"
    description: {zh: "弹幕偏好写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Danmaku preference write request carrying only client-provided fields"}
    schema: {"type":"object","description":"弹幕偏好写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Danmaku preference write request carrying only client-provided fields","additionalProperties":false,"properties":{"blockedKeywords":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 blockedKeywords（语义见对应领域契约） / Field blockedKeywords"},"blockedRegex":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 blockedRegex（语义见对应领域契约） / Field blockedRegex"},"blockedTypes":{"type":"array","items":{"type":"string","enum":["SCROLL","TOP","BOTTOM","REVERSE"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 blockedTypes（语义见对应领域契约） / Field blockedTypes"},"blockedSenders":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 blockedSenders（语义见对应领域契约） / Field blockedSenders"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["blockedKeywords","blockedRegex","blockedTypes","blockedSenders","idempotencyKey","requestContext"]}
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
