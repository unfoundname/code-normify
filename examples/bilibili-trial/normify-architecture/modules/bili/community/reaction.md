---
uid: 875d683d
id: bili.community.reaction
parent: bili.community
state: planned
tags: ["worker:com-reaction"]
name: {zh: "点赞、分享与互动记录", en: "Reactions, Sharing and Interaction Log"}
description:
  zh: >
      点赞切换（幂等）、分享渠道与短链、个人互动记录（赞/币/藏/转/评）；计数为投影，不直接改他人表。
      
  en: >
      Idempotent like toggle, share channels and tokens, personal interaction log; counters are projections.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/reaction/src/service.ts"
  - path: "services/community/reaction/migrations/0001_reaction.sql"
  - path: "services/community/reaction/tests/reaction.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/reactions"
    description:
      zh: >
          切换点赞状态（幂等）
          
      en: >
          Toggle reaction
          
    input: {module: "bili.community.reaction", name: "ToggleReactionRequest"}
    output: {module: "bili.community.reaction", name: "ReactionRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/shares"
    description:
      zh: >
          生成分享记录与短链
          
      en: >
          Create share
          
    input: {module: "bili.community.reaction", name: "ShareRecord"}
    output: {module: "bili.community.reaction", name: "ShareRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/users/me/interactions"
    description:
      zh: >
          读取我的互动记录
          
      en: >
          List my interactions
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.community.reaction", name: "InteractionHistoryItem"}
  - protocol: mysql
    path: "reaction"
    description:
      zh: >
          互动记录表（唯一写入所有者：互动服务）
          
      en: >
          reaction table
          
types:
  - name: "ReactionRecord"
    description: {zh: "互动记录", en: "Reaction record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 reaction，唯一约束 user_id+target_type+target_id+kind","properties":{"reactionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["video","dynamic","comment","article","danmaku"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","enum":["like","dislike","favorite","share","coin","comment"],"description":"类型"},"active":{"type":"boolean","description":"是否有效（取消后置 false）"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["reactionId","userId","targetType","targetId","kind","active"]}
  - name: "ShareRecord"
    description: {zh: "分享记录", en: "Share record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 share_record；短链解析不落隐私字段","properties":{"shareId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"channel":{"type":"string","enum":["internal","wechat","weibo","qq","copy_link","qr_code","embed"],"description":"渠道"},"shareToken":{"type":"string","description":"短链/分享令牌"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["shareId","userId","targetType","targetId","channel","createdAt"]}
  - name: "InteractionHistoryItem"
    description: {zh: "互动记录条目", en: "Interaction history item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 interaction_history，索引 user_id+occurred_at","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","description":"互动类型"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["itemId","userId","targetId","kind","occurredAt"]}
  - name: "ToggleReactionRequest"
    description: {zh: "点赞切换请求", en: "Toggle reaction"}
    schema: {"type":"object","additionalProperties":false,"properties":{"targetType":{"type":"string","enum":["video","dynamic","comment","article","danmaku"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","enum":["like","dislike"],"description":"类型"},"desired":{"type":"boolean","description":"目标状态（true 点赞）"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["targetType","targetId","kind","desired","idempotencyKey"]}
deps:
  - kind: event
    to: bili.contract.core.events
    label: {zh: "点赞/分享事件驱动计数投影", en: "Reaction events drive counters"}
  - kind: call
    to: bili.infra.cache
    label: {zh: "热度计数缓存", en: "Hot counter cache"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "异常点赞风控审计", en: "Audit abnormal reactions"}
---
