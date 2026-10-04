---
uid: a0d429ea
id: bili.message.system
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "系统提醒与公告", en: "System notices and announcements"}
description:
  zh: >
      系统公告、活动提醒、站内信与定时下发
  en: >
      System announcements, campaign reminders,站内信 and scheduled delivery
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/system/src/system-notice.ts"
  - path: "services/message/system/tests/system-notice.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/message/system-notices"
    description:
      zh: >
          创建系统提醒
      en: >
          Create a system notice
    input: {module: "bili.message.system", name: "SystemRequest"}
    output: {module: "bili.message.system", name: "SystemNotice"}
types:
  - name: "SystemNotice"
    description: {zh: "系统提醒", en: "System notice"}
    schema: {"type":"object","description":"系统提醒 / System notice","additionalProperties":false,"properties":{"noticeId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 noticeId（语义见对应领域契约） / Field noticeId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"audience":{"type":"string","enum":["ALL","USERS","UPSTREAM","CREATORS","PAYING"],"description":"字段 audience（语义见对应领域契约） / Field audience"},"publishAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 publishAt（语义见对应领域契约） / Field publishAt"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"}},"required":["noticeId","title","content","audience","publishAt"]}
  - name: "SystemRequest"
    description: {zh: "系统提醒写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "System notice write request carrying only client-provided fields"}
    schema: {"type":"object","description":"系统提醒写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / System notice write request carrying only client-provided fields","additionalProperties":false,"properties":{"noticeId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 noticeId（语义见对应领域契约） / Field noticeId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"audience":{"type":"string","enum":["ALL","USERS","UPSTREAM","CREATORS","PAYING"],"description":"字段 audience（语义见对应领域契约） / Field audience"},"publishAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 publishAt（语义见对应领域契约） / Field publishAt"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["noticeId","title","content","audience","publishAt","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.ops.activity
    label: {zh: "运营活动通知来源", en: "Campaign notice source"}
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
