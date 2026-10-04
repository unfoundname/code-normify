---
uid: 186d222c
id: bili.message.unread
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "未读与红点", en: "Unread counters and badges"}
description:
  zh: >
      分类未读数、红点聚合与清零
  en: >
      Per-category unread counts, badge aggregation and clearing
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/unread/src/unread.ts"
  - path: "services/message/unread/tests/unread.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/message/unread"
    description:
      zh: >
          查询未读汇总
      en: >
          Get unread summary
    output: {module: "bili.message.unread", name: "UnreadSummary"}
types:
  - name: "UnreadSummary"
    description: {zh: "未读汇总", en: "Unread summary"}
    schema: {"type":"object","description":"未读汇总 / Unread summary","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"total":{"type":"integer","description":"总条数 / Total count"},"byType":{"type":"array","items":{"$ref":"urn:normify:bili.message.unread:UnreadByType"},"description":"字段 byType（语义见对应领域契约） / Field byType"}},"required":["userId","total","byType"]}
  - name: "UnreadByType"
    description: {zh: "分类未读数", en: "Unread by type"}
    schema: {"type":"object","description":"分类未读数 / Unread by type","additionalProperties":false,"properties":{"notifyType":{"type":"string","enum":["REPLY","MENTION","LIKE","COIN","FOLLOW","SYSTEM","DM"],"description":"通知类型 / Notification type"},"count":{"type":"integer","description":"字段 count（语义见对应领域契约） / Field count"}},"required":["notifyType","count"]}
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
