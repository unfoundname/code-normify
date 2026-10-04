---
uid: 4d8fc806
id: data.live.t-f6278ddb
parent: data.live
state: planned
tags: ["worker:live-dm", "projection:data-contract"]
name: {zh: "LiveDanmakuPolicy", en: "LiveDanmakuPolicy"}
description:
  zh: >
      房间弹幕策略
  en: >
      Room danmaku policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-f6278ddb.json"
apis: []
types:
  - name: "LiveDanmakuPolicy"
    description: {zh: "房间弹幕策略", en: "Room danmaku policy"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_danmaku_policy，唯一约束 room_id","properties":{"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"needFollowToChat":{"type":"boolean","description":"是否需关注才能发言"},"minUserLevel":{"type":"integer","description":"发言等级门槛","minimum":0},"minIntervalMs":{"type":"integer","description":"最小间隔毫秒","minimum":0},"keywordBlocks":{"type":"array","description":"屏蔽关键词","items":{"type":"string","description":"关键词"}},"mutedUserIds":{"type":"array","description":"禁言用户","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"moderatorIds":{"type":"array","description":"房管","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["roomId","needFollowToChat","minIntervalMs"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
