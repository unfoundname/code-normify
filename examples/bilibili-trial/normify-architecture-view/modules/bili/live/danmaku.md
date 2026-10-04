---
uid: 803e214e
id: bili.live.danmaku
parent: bili.live
state: planned
tags: ["worker:live-dm"]
name: {zh: "直播实时弹幕", en: "Live Danmaku"}
description:
  zh: >
      实时聊天消息、进入/礼物/系统播报、频率与等级门槛、关键词屏蔽与房管管理。
      
  en: >
      Realtime chat, enter/gift/system notices, rate and level gates, keyword blocking and room moderation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/danmaku/src/ingest.ts"
  - path: "services/live/danmaku/src/broadcast.ts"
  - path: "services/live/danmaku/migrations/0001_live_danmaku.sql"
  - path: "services/live/danmaku/tests/live-danmaku.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/danmaku"
    description:
      zh: >
          发送直播消息
          
      en: >
          Send live message
          
    input: {module: "bili.live.danmaku", name: "LiveDanmakuMessage"}
    output: {module: "bili.live.danmaku", name: "LiveDanmakuMessage"}
  - protocol: http
    method: GET
    path: "/api/v1/live/rooms/{id}/danmaku"
    description:
      zh: >
          按时间窗读取历史弹幕
          
      en: >
          Read message window
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.live.danmaku", name: "LiveDanmakuMessage"}
  - protocol: http
    method: PUT
    path: "/api/v1/live/rooms/{id}/danmaku-policy"
    description:
      zh: >
          设置房间弹幕策略
          
      en: >
          Set room policy
          
    input: {module: "bili.live.danmaku", name: "LiveDanmakuPolicy"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: amqp
    path: "live.danmaku.broadcast"
    description:
      zh: >
          直播消息广播主题（长连接扇出，MQ 待接入）
          
      en: >
          Live broadcast topic
          
    input: {module: "bili.live.danmaku", name: "LiveDanmakuMessage"}
  - protocol: mysql
    path: "live_danmaku_policy"
    description:
      zh: >
          直播弹幕策略表（唯一写入所有者：直播弹幕服务）
          
      en: >
          live danmaku policy table
          
types:
  - name: "LiveDanmakuMessage"
    description: {zh: "直播消息", en: "Live message"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_danmaku_message；实时通道只做扇出，历史回放按时间窗查询","properties":{"messageId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["chat","enter_notice","gift_notice","guard_notice","system","super_chat"],"description":"类型"},"content":{"type":"string","description":"内容","maxLength":200},"colorHex":{"type":"string","description":"颜色"},"sentAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"blocked":{"type":"boolean","description":"是否被拦截"},"blockReason":{"type":"string","description":"拦截原因"}},"required":["messageId","roomId","type","sentAt"]}
  - name: "LiveDanmakuPolicy"
    description: {zh: "房间弹幕策略", en: "Room danmaku policy"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_danmaku_policy，唯一约束 room_id","properties":{"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"needFollowToChat":{"type":"boolean","description":"是否需关注才能发言"},"minUserLevel":{"type":"integer","description":"发言等级门槛","minimum":0},"minIntervalMs":{"type":"integer","description":"最小间隔毫秒","minimum":0},"keywordBlocks":{"type":"array","description":"屏蔽关键词","items":{"type":"string","description":"关键词"}},"mutedUserIds":{"type":"array","description":"禁言用户","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"moderatorIds":{"type":"array","description":"房管","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["roomId","needFollowToChat","minIntervalMs"]}
deps:
  - kind: call
    to: bili.live.room
    from_api: "POST /api/v1/live/rooms/{id}/danmaku"
    to_api: "GET /api/v1/live/rooms/{id}"
    label: {zh: "仅直播中房间可发言", en: "Only living rooms accept messa"}
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/live/rooms/{id}/danmaku"
    label: {zh: "黑名单与禁言校验", en: "Blacklist and mute check"}
  - kind: call
    to: bili.social.follow
    label: {zh: "关注门槛校验", en: "Follow gate check"}
  - kind: call
    to: bili.infra.cache
    label: {zh: "热点房间消息聚合", en: "Hot room aggregation"}
---
