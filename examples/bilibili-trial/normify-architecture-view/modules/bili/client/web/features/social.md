---
uid: 0c8286a2
id: bili.client.web.features.social
parent: bili.client.web.features
state: planned
tags: ["worker:web-social"]
name: {zh: "社交与消息前端", en: "Social Feature"}
description:
  zh: >
      动态流（关注/推荐/话题）、发布动态、关注分组管理、私信会话与通知中心。
      
  en: >
      Feed (following/recommend/topic), dynamic composer, follow groups, direct messages and notification center.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/social/index.ts"
  - path: "apps/web/src/features/social/pages/DynamicFeedPage.tsx"
  - path: "apps/web/src/features/social/pages/MessageCenterPage.tsx"
  - path: "apps/web/src/features/social/tests/social.test.tsx"
apis: []
types:
  - name: "FeedViewModel"
    description: {zh: "动态流视图模型", en: "Feed view model"}
    schema: {"type":"object","additionalProperties":false,"properties":{"kind":{"type":"string","enum":["following","recommend","topic"],"description":"流类型"},"page":{"$ref":"urn:normify:bili.social.feed:FeedPage"},"activeTopicId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"newItemCount":{"type":"integer","description":"新动态提示数","minimum":0},"composerOpen":{"type":"boolean","description":"发布器是否展开"}},"required":["kind","page"]}
  - name: "MessageCenterState"
    description: {zh: "消息中心状态", en: "Message center state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"activeConversationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"unreadTotal":{"type":"integer","description":"总未读","minimum":0},"notifications":{"type":"array","description":"最近通知","items":{"$ref":"urn:normify:bili.social.message:NotificationRecord"}},"filter":{"type":"string","enum":["all","reply","like","follow","system"],"description":"过滤"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["unreadTotal","filter"]}
deps:
  - kind: call
    to: bili.social.feed
    to_api: "GET /api/v1/dynamics/feed"
    label: {zh: "动态流与发布", en: "Feed and publish"}
  - kind: call
    to: bili.social.follow
    to_api: "POST /api/v1/follows"
    label: {zh: "关注与分组", en: "Follows and groups"}
  - kind: call
    to: bili.social.message
    to_api: "GET /api/v1/notifications"
    label: {zh: "私信与通知", en: "Messages and notifications"}
  - kind: call
    to: bili.identity.profile
    label: {zh: "空间与资料跳转", en: "Profile links"}
---
