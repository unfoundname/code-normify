---
uid: d27e4ab2
id: bili.message.notify
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "互动通知", en: "Interaction notifications"}
description:
  zh: >
      回复、@、点赞、投币、关注与收藏通知及未读聚合
  en: >
      Reply, mention, like, coin, follow and favorite notifications with unread aggregation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/notify/src/notify.ts"
  - path: "services/message/notify/tests/notify.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/message/notifications"
    description:
      zh: >
          通知列表
      en: >
          List notifications
    output: {module: "bili.message.notify", name: "NotificationPage"}
  - protocol: http
    method: POST
    path: "/api/v1/message/notifications/read"
    description:
      zh: >
          标记已读
      en: >
          Mark notifications read
    input: {module: "bili.message.notify", name: "MarkReadRequest"}
  - protocol: kafka
    path: "consume.bili.identity.level-changed"
    description:
      zh: >
          消费等级变更事件生成升级通知
      en: >
          Consume level-changed events to create level-up notifications
    input: {module: "bili.identity.level", name: "LevelChangedConsumedEvent"}
types:
  - name: "NotificationView"
    description: {zh: "通知视图", en: "Notification view"}
    schema: {"type":"object","description":"通知视图 / Notification view","additionalProperties":false,"properties":{"notificationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 notificationId（语义见对应领域契约） / Field notificationId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"notifyType":{"type":"string","enum":["REPLY","MENTION","LIKE","COIN","FOLLOW","FAVORITE","SYSTEM"],"description":"通知类型 / Notification type"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"unread":{"type":"boolean","description":"字段 unread（语义见对应领域契约） / Field unread"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["notificationId","userId","notifyType","targetId","unread","createdAt"]}
  - name: "MarkReadRequest"
    description: {zh: "标记已读请求", en: "Mark read request"}
    schema: {"type":"object","description":"标记已读请求 / Mark read request","additionalProperties":false,"properties":{"notificationIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 notificationIds（语义见对应领域契约） / Field notificationIds"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["notificationIds","idempotencyKey","requestContext"]}
  - name: "NotificationPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.message.notify:NotificationView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "消费社区与关注事件生成通知", en: "Consume community and follow"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
