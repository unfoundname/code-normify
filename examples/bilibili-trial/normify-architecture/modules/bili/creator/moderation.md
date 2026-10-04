---
uid: 1a2ca749
id: bili.creator.moderation
parent: bili.creator
state: planned
tags: ["worker:cre-interact"]
name: {zh: "弹幕评论管理", en: "Interaction Moderation"}
description:
  zh: >
      UP 主视角的弹幕/评论检索、删除、禁言、置顶精选与一键开启先审后发；动作全部转为领域命令。
      
  en: >
      Up-owner danmaku/comment search, delete, mute, pin/feature and review-first toggle via domain commands.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/moderation/src/query.ts"
  - path: "services/creator/moderation/src/actions.ts"
  - path: "services/creator/moderation/tests/moderation.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/interactions"
    description:
      zh: >
          检索弹幕与评论
          
      en: >
          Search interactions
          
    input: {module: "bili.creator.moderation", name: "CreatorInteractionQuery"}
    output: {module: "bili.creator.moderation", name: "CreatorInteractionItem"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/interactions/actions"
    description:
      zh: >
          执行管理动作
          
      en: >
          Apply moderation action
          
    input: {module: "bili.creator.moderation", name: "CreatorInteractionAction"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "CreatorInteractionQuery"
    description: {zh: "互动检索条件", en: "Interaction query"}
    schema: {"type":"object","additionalProperties":false,"description":"仅能检索自己视频下的互动","properties":{"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["danmaku","comment"],"description":"类型"},"state":{"type":"string","enum":["all","visible","hidden","under_review","blocked"],"description":"状态"},"keyword":{"type":"string","description":"关键词"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"dateFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dateTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"cursor":{"type":"string","description":"游标"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":100}},"required":["ownerId","type","pageSize"]}
  - name: "CreatorInteractionItem"
    description: {zh: "互动条目", en: "Interaction item"}
    schema: {"type":"object","additionalProperties":false,"description":"跨域只读聚合","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["danmaku","comment"],"description":"类型"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"内容"},"timeMs":{"type":"integer","description":"弹幕时间点毫秒","minimum":0},"state":{"type":"string","description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"reportCount":{"type":"integer","description":"被举报次数","minimum":0}},"required":["itemId","type","videoId","content","state"]}
  - name: "CreatorInteractionAction"
    description: {zh: "互动管理动作", en: "Interaction action"}
    schema: {"type":"object","additionalProperties":false,"description":"动作翻译为弹幕/评论领域命令，禁止直改对方表","properties":{"itemIds":{"type":"array","description":"条目 id","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"minItems":1,"maxItems":100},"itemType":{"type":"string","enum":["danmaku","comment"],"description":"类型"},"action":{"type":"string","enum":["delete","hide","restore","pin","feature","mute_author_in_video","ban_author_in_video","enable_review_first"],"description":"动作"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reason":{"type":"string","description":"原因"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["itemIds","itemType","action","idempotencyKey"]}
deps:
  - kind: call
    to: bili.community.comment
    from_api: "POST /api/v1/creator/interactions/actions"
    to_api: "POST /api/v1/comments/{id}/moderation"
    label: {zh: "评论管理与置顶精选", en: "Comment moderation"}
  - kind: call
    to: bili.danmaku.prefs
    from_api: "POST /api/v1/creator/interactions/actions"
    to_api: "PUT /api/v1/danmaku/up-policy/{videoId}"
    label: {zh: "UP 主弹幕策略与禁言", en: "Up-owner danmaku policy"}
  - kind: call
    to: bili.danmaku.post
    label: {zh: "弹幕举报与删除", en: "Danmaku report and delete"}
  - kind: call
    to: bili.creator.works
    label: {zh: "校验稿件归属", en: "Check work ownership"}
---
