---
uid: 3fdfa998
id: bili.message.dm
parent: bili.message
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "私信", en: "Direct messages"}
description:
  zh: >
      会话、消息发送、已读回执、图片与撤回
  en: >
      Conversations, message sending, read receipts, images and recall
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/message/dm/src/dm.ts"
  - path: "services/message/dm/tests/dm.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/message/dm"
    description:
      zh: >
          发送私信
      en: >
          Send a direct message
    input: {module: "bili.message.dm", name: "SendDmRequest"}
    output: {module: "bili.message.dm", name: "Conversation"}
  - protocol: ws
    path: "/ws/message"
    description:
      zh: >
          私信长连接
      en: >
          Direct message websocket
    output: {module: "bili.message.dm", name: "DirectMessageFrame"}
types:
  - name: "Conversation"
    description: {zh: "私信会话", en: "Direct conversation"}
    schema: {"type":"object","description":"私信会话 / Direct conversation","additionalProperties":false,"properties":{"conversationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Conversation id"},"participantIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 participantIds（语义见对应领域契约） / Field participantIds"},"lastMessageAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 lastMessageAt（语义见对应领域契约） / Field lastMessageAt"},"unreadCount":{"type":"integer","description":"未读数 / Unread count"}},"required":["conversationId","participantIds","lastMessageAt","unreadCount"]}
  - name: "SendDmRequest"
    description: {zh: "发送私信请求", en: "Send dm request"}
    schema: {"type":"object","description":"发送私信请求 / Send dm request","additionalProperties":false,"properties":{"conversationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Conversation id"},"toUserId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 toUserId（语义见对应领域契约） / Field toUserId"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"mediaRefs":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 mediaRefs（语义见对应领域契约） / Field mediaRefs"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["toUserId","content","mediaRefs","idempotencyKey","requestContext"]}
  - name: "DirectMessageFrame"
    description: {zh: "私信实时帧", en: "Direct message frame"}
    schema: {"type":"object","description":"私信实时帧 / Direct message frame","additionalProperties":false,"properties":{"messageId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 messageId（语义见对应领域契约） / Field messageId"},"conversationId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Conversation id"},"senderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 senderId（语义见对应领域契约） / Field senderId"},"text":{"type":"string","minLength":1,"description":"文本内容 / Text"},"mediaRefs":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 mediaRefs（语义见对应领域契约） / Field mediaRefs"},"sequence":{"type":"integer","description":"字段 sequence（语义见对应领域契约） / Field sequence"},"sentAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 sentAt（语义见对应领域契约） / Field sentAt"}},"required":["messageId","conversationId","senderId","text","mediaRefs","sequence","sentAt"]}
deps:
  - kind: call
    to: bili.identity.privacy
    label: {zh: "私信接收权限与黑名单", en: "Dm permission and blocklist"}
  - kind: call
    to: bili.message.push
    label: {zh: "离线推送", en: "Offline push"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一幂等与上下文契约", en: "Unified idempotency and"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
---
