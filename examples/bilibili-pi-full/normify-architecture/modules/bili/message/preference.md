---
uid: f3056426
id: bili.message.preference
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "消息偏好", en: "Message preferences"}
description:
  zh: >
      分类开关、免打扰时段、渠道偏好与退订
  en: >
      Per-category switches, quiet hours, channel preferences and unsubscribe
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/preference/src/preference.ts"
  - path: "services/message/preference/tests/preference.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/message/preferences"
    description:
      zh: >
          更新消息偏好
      en: >
          Update message preferences
    input: {module: "bili.message.preference", name: "MessageRequest"}
    output: {module: "bili.message.preference", name: "MessagePreference"}
types:
  - name: "MessagePreference"
    description: {zh: "消息偏好", en: "Message preference"}
    schema: {"type":"object","description":"消息偏好 / Message preference","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"channels":{"type":"array","items":{"type":"string","enum":["WEB","PUSH","SMS","EMAIL"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 channels（语义见对应领域契约） / Field channels"},"quietHours":{"type":"string","minLength":1,"description":"字段 quietHours（语义见对应领域契约） / Field quietHours"},"mutedTypes":{"type":"array","items":{"type":"string","enum":["REPLY","MENTION","LIKE","COIN","FOLLOW","SYSTEM"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 mutedTypes（语义见对应领域契约） / Field mutedTypes"}},"required":["userId","channels","mutedTypes"]}
  - name: "MessageRequest"
    description: {zh: "消息偏好写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Message preference write request carrying only client-provided fields"}
    schema: {"type":"object","description":"消息偏好写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Message preference write request carrying only client-provided fields","additionalProperties":false,"properties":{"channels":{"type":"array","items":{"type":"string","enum":["WEB","PUSH","SMS","EMAIL"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 channels（语义见对应领域契约） / Field channels"},"quietHours":{"type":"string","minLength":1,"description":"字段 quietHours（语义见对应领域契约） / Field quietHours"},"mutedTypes":{"type":"array","items":{"type":"string","enum":["REPLY","MENTION","LIKE","COIN","FOLLOW","SYSTEM"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 mutedTypes（语义见对应领域契约） / Field mutedTypes"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["channels","mutedTypes","idempotencyKey","requestContext"]}
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
