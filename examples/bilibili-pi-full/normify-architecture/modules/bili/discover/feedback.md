---
uid: 7644bee6
id: bili.discover.feedback
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "行为反馈", en: "Behavior feedback"}
description:
  zh: >
      曝光/点击/播放/不感兴趣回传与特征回写
  en: >
      Exposure, click, play and not-interested feedback with feature write-back
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/feedback/src/feedback.ts"
  - path: "services/discover/feedback/tests/feedback.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/discover/feedback"
    description:
      zh: >
          回传行为反馈
      en: >
          Report behavior feedback
    input: {module: "bili.discover.feedback", name: "BehaviorRequest"}
types:
  - name: "BehaviorFeedback"
    description: {zh: "行为反馈", en: "Behavior feedback"}
    schema: {"type":"object","description":"行为反馈 / Behavior feedback","additionalProperties":false,"properties":{"feedbackId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 feedbackId（语义见对应领域契约） / Field feedbackId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"feedbackType":{"type":"string","enum":["EXPOSE","CLICK","PLAY","FINISH","NOT_INTERESTED","BLOCK"],"description":"反馈类型 / Feedback type"},"occurredAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发生时间 / Occurred at"}},"required":["feedbackId","userId","resourceId","feedbackType","occurredAt"]}
  - name: "BehaviorRequest"
    description: {zh: "行为反馈写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Behavior feedback write request carrying only client-provided fields"}
    schema: {"type":"object","description":"行为反馈写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Behavior feedback write request carrying only client-provided fields","additionalProperties":false,"properties":{"feedbackId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 feedbackId（语义见对应领域契约） / Field feedbackId"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"feedbackType":{"type":"string","enum":["EXPOSE","CLICK","PLAY","FINISH","NOT_INTERESTED","BLOCK"],"description":"反馈类型 / Feedback type"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["feedbackId","resourceId","feedbackType","idempotencyKey","requestContext"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "反馈事件进入特征与训练管线", en: "Feedback events feed features"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
