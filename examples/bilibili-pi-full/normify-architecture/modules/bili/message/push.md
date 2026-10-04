---
uid: 832414c7
id: bili.message.push
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "推送适配", en: "Push adapters"}
description:
  zh: >
      推送通道适配（APNs/FCM/厂商通道/短信模板）与回执
  en: >
      Push channel adapters (APNs/FCM/vendor/SMS templates) with receipts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/push/src/push-adapter.ts"
  - path: "services/message/push/tests/push-adapter.test.ts"
apis:
  - protocol: rpc
    path: "message.push.send"
    description:
      zh: >
          发送推送
      en: >
          Send a push
    input: {module: "bili.message.push", name: "PushTask"}
    output: {module: "bili.message.push", name: "PushTask"}
types:
  - name: "PushTask"
    description: {zh: "推送任务", en: "Push task"}
    schema: {"type":"object","description":"推送任务 / Push task","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"channel":{"type":"string","enum":["PUSH","SMS","EMAIL","WEB"],"description":"推送通道 / Push channel"},"templateId":{"type":"string","minLength":1,"description":"字段 templateId（语义见对应领域契约） / Field templateId"},"payloadJson":{"type":"string","minLength":1,"description":"字段 payloadJson（语义见对应领域契约） / Field payloadJson"},"status":{"type":"string","enum":["QUEUED","SENT","FAILED","RECEIPT"],"description":"状态 / Status"}},"required":["taskId","userId","channel","templateId","payloadJson","status"]}
deps:
  - kind: reference
    to: bili.infra.observe
    label: {zh: "推送回执与告警接入", en: "Push receipts and alerts"}
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
