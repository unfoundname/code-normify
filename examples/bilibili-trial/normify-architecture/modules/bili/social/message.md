---
uid: e5351411
id: bili.social.message
parent: bili.social
state: planned
tags: ["worker:soc-message"]
name: {zh: "私信与通知", en: "Messages and Notifications"}
description:
  zh: >
      私信会话、回复/点赞/关注/系统/直播通知、通知偏好与未读计数、撤回与举报。
      
  en: >
      Direct messages, reply/like/follow/system/live notifications, preferences, unread counts, recall and report.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/message/src/direct.ts"
  - path: "services/social/message/src/notification.ts"
  - path: "services/social/message/migrations/0001_message.sql"
  - path: "services/social/message/tests/message.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/messages"
    description:
      zh: >
          发送私信
          
      en: >
          Send direct message
          
    input: {module: "bili.social.message", name: "DirectMessage"}
    output: {module: "bili.social.message", name: "DirectMessage"}
  - protocol: http
    method: GET
    path: "/api/v1/messages/conversations"
    description:
      zh: >
          列出会话与未读
          
      en: >
          List conversations
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.social.message", name: "Conversation"}
  - protocol: http
    method: GET
    path: "/api/v1/notifications"
    description:
      zh: >
          列出通知
          
      en: >
          List notifications
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.social.message", name: "NotificationRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/notifications/read"
    description:
      zh: >
          批量标记已读
          
      en: >
          Mark notifications read
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: PUT
    path: "/api/v1/notifications/preferences"
    description:
      zh: >
          保存通知偏好
          
      en: >
          Save notification preferences
          
    input: {module: "bili.social.message", name: "NotificationPreference"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "notification"
    description:
      zh: >
          通知表（唯一写入所有者：通知服务）
          
      en: >
          notification table
          
types:
  - name: "DirectMessage"
    description: {zh: "私信", en: "Direct message"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 direct_message，索引 conversation_id+created_at；陌生人消息受隐私设置约束","properties":{"messageId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"conversationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"senderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"receiverId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"contentType":{"type":"string","enum":["text","image","video_share","article_share","system_card"],"description":"内容类型"},"content":{"type":"string","description":"正文","maxLength":2000},"payloadRef":{"type":"string","description":"分享对象引用"},"readAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"recalledAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["messageId","conversationId","senderId","receiverId","contentType","createdAt"]}
  - name: "Conversation"
    description: {zh: "会话", en: "Conversation"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 conversation；参与者关联表 conversation_participant","properties":{"conversationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"participantIds":{"type":"array","description":"参与者","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"lastMessageAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"unreadCount":{"type":"integer","description":"未读数","minimum":0},"state":{"type":"string","enum":["active","archived","blocked"],"description":"状态"}},"required":["conversationId","participantIds","lastMessageAt"]}
  - name: "NotificationRecord"
    description: {zh: "通知", en: "Notification"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 notification，索引 user_id+created_at、dedupe_key 唯一","properties":{"notificationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"category":{"type":"string","enum":["reply","like","coin","follow","system","live","order","copyright"],"description":"类别"},"actorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":120},"body":{"type":"string","description":"正文","maxLength":500},"readAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dedupeKey":{"type":"string","description":"去重键（同事件重复投递合并）"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["notificationId","userId","category","title","createdAt"]}
  - name: "NotificationPreference"
    description: {zh: "通知偏好", en: "Notification preference"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 notification_preference，唯一约束 user_id+category+channel","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"category":{"type":"string","description":"类别"},"channel":{"type":"string","enum":["inbox","web_push","app_push","sms","email"],"description":"渠道"},"enabled":{"type":"boolean","description":"是否启用"},"quietHoursStart":{"type":"integer","description":"免打扰开始小时","minimum":0,"maximum":23},"quietHoursEnd":{"type":"integer","description":"免打扰结束小时","minimum":0,"maximum":23}},"required":["userId","category","channel","enabled"]}
deps:
  - kind: call
    to: bili.infra.notify
    from_api: "GET /api/v1/notifications"
    label: {zh: "跨端下发短信/推送", en: "Send sms or push"}
  - kind: call
    to: bili.social.follow
    label: {zh: "系统通知按关注关系筛选", en: "Filter system notifications"}
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/messages"
    to_api: "GET /api/v1/users/{userId}"
    label: {zh: "陌生人私信隐私校验", en: "Stranger message privacy"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "消费各域事件生成通知", en: "Consume domain events into not"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "通知去重与批量投递任务", en: "Dedup and batch delivery jobs"}
---
