---
uid: 414d652e
id: bili.client.web.message
parent: bili.client.web
state: planned
tags: [planned, "worker:W-MESSAGE", leaf]
name: {zh: "消息中心", en: "Message center"}
description:
  zh: >
      私信会话、互动通知、系统提醒与偏好设置
  en: >
      Direct conversations, interaction notifications, system notices and preferences
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/message/MessageCenter.tsx"
  - path: "apps/web/tests/features/message/MessageCenter.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/message"
    description:
      zh: >
          消息中心路由
      en: >
          Message center route
    output: {module: "bili.client.web.message", name: "MessageCenterModel"}
types:
  - name: "MessageCenterModel"
    description: {zh: "消息中心视图模型", en: "Message center model"}
    schema: {"type":"object","description":"消息中心视图模型 / Message center model","additionalProperties":false,"properties":{"conversations":{"type":"array","items":{"$ref":"urn:normify:bili.message.dm:Conversation"},"description":"字段 conversations（语义见对应领域契约） / Field conversations"},"notifications":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 notifications（语义见对应领域契约） / Field notifications"},"unread":{"$ref":"urn:normify:bili.message.unread:UnreadSummary","description":"字段 unread（语义见对应领域契约） / Field unread"}},"required":["conversations","notifications","unread"]}
deps:
  - kind: call
    to: bili.message.dm
    label: {zh: "私信会话", en: "Direct messages"}
  - kind: call
    to: bili.message.notify
    label: {zh: "互动通知", en: "Notifications"}
  - kind: call
    to: bili.message.preference
    label: {zh: "通知偏好", en: "Notification preferences"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
