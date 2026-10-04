---
uid: fa2dc018
id: bili.social.mute
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "屏蔽与不感兴趣", en: "Mute and not-interested"}
description:
  zh: >
      关注屏蔽词、屏蔽话题、内容不感兴趣与恢复
  en: >
      Muted keywords, muted topics, not-interested marks and recovery
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/mute/src/mute.ts"
  - path: "services/social/mute/tests/mute.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/social/mute-rules"
    description:
      zh: >
          新增屏蔽规则
      en: >
          Add a mute rule
    input: {module: "bili.social.mute", name: "MuteRequest"}
    output: {module: "bili.social.mute", name: "MuteRule"}
  - protocol: http
    method: DELETE
    path: "/api/v1/social/mute-rules/"
    description:
      zh: >
          删除屏蔽规则
      en: >
          Delete a mute rule
    input: {module: "bili.social.mute", name: "DeleteMuteRuleRequest"}
types:
  - name: "MuteRule"
    description: {zh: "屏蔽规则", en: "Mute rule"}
    schema: {"type":"object","description":"屏蔽规则 / Mute rule","additionalProperties":false,"properties":{"ruleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 ruleId（语义见对应领域契约） / Field ruleId"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"kind":{"type":"string","enum":["KEYWORD","TOPIC","UPLOADER"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"value":{"type":"string","minLength":1,"description":"字段 value（语义见对应领域契约） / Field value"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["ruleId","ownerId","kind","value","createdAt"]}
  - name: "DeleteMuteRuleRequest"
    description: {zh: "删除屏蔽规则请求", en: "Delete mute rule request"}
    schema: {"type":"object","description":"删除屏蔽规则请求 / Delete mute rule request","additionalProperties":false,"properties":{"ruleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 ruleId（语义见对应领域契约） / Field ruleId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["ruleId","idempotencyKey","requestContext"]}
  - name: "MuteRequest"
    description: {zh: "屏蔽规则写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Mute rule write request carrying only client-provided fields"}
    schema: {"type":"object","description":"屏蔽规则写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Mute rule write request carrying only client-provided fields","additionalProperties":false,"properties":{"ruleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 ruleId（语义见对应领域契约） / Field ruleId"},"kind":{"type":"string","enum":["KEYWORD","TOPIC","UPLOADER"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"value":{"type":"string","minLength":1,"description":"字段 value（语义见对应领域契约） / Field value"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["ruleId","kind","value","idempotencyKey","requestContext"]}
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
