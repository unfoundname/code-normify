---
uid: ef41811e
id: bili.client.web.features.community
parent: bili.client.web.features
state: planned
tags: ["worker:web-community"]
name: {zh: "社区互动前端", en: "Community Feature"}
description:
  zh: >
      评论区（含楼中楼/置顶/精选）、点赞投币收藏分享操作条、收藏夹管理页与互动记录页。
      
  en: >
      Comment thread UI, like/coin/favorite/share action bar, favorite folder manager and interaction log.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/community/index.ts"
  - path: "apps/web/src/features/community/components/CommentThread.tsx"
  - path: "apps/web/src/features/community/components/ActionBar.tsx"
  - path: "apps/web/src/features/community/tests/community.test.tsx"
apis: []
types:
  - name: "CommentThreadState"
    description: {zh: "评论区状态", en: "Comment thread state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"page":{"$ref":"urn:normify:bili.community.comment:CommentPage"},"sort":{"type":"string","enum":["hot","new"],"description":"排序"},"activeRootId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"replyDraft":{"type":"string","description":"回复草稿","maxLength":1000},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["targetType","targetId","sort"]}
  - name: "ActionBarState"
    description: {zh: "操作条状态", en: "Action bar state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"liked":{"type":"boolean","description":"是否已点赞"},"coinCount":{"type":"integer","description":"已投币数","minimum":0,"maximum":2},"favoriteFolderIds":{"type":"array","description":"已收藏的收藏夹","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"shareCount":{"type":"integer","description":"分享数","minimum":0},"pending":{"type":"boolean","description":"是否有进行中的写操作"}},"required":["targetId","liked","coinCount"]}
deps:
  - kind: call
    to: bili.community.comment
    to_api: "GET /api/v1/comments"
    label: {zh: "评论读取与管理", en: "Comments read and moderate"}
  - kind: call
    to: bili.community.reaction
    to_api: "PUT /api/v1/reactions"
    label: {zh: "点赞与分享", en: "Like and share"}
  - kind: call
    to: bili.community.coin
    to_api: "POST /api/v1/coins/spend"
    label: {zh: "投币与余额", en: "Coin and balance"}
  - kind: call
    to: bili.community.favorite
    to_api: "POST /api/v1/favorites/items"
    label: {zh: "收藏夹管理", en: "Favorites"}
---
