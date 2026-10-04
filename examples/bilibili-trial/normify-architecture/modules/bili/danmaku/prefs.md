---
uid: 79e82d3c
id: bili.danmaku.prefs
parent: bili.danmaku
state: planned
tags: ["worker:dm-prefs"]
name: {zh: "屏蔽偏好与 UP 主管理", en: "Block Rules and Up-Owner Control"}
description:
  zh: >
      用户屏蔽词/正则/类型/用户屏蔽、透明度与显示区域偏好；UP 主对自有视频的弹幕管理与禁言。
      
  en: >
      User block keywords/regex/type/user rules with display preferences; up-owner danmaku moderation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/prefs/src/preferences.ts"
  - path: "services/danmaku/prefs/src/up-policy.ts"
  - path: "services/danmaku/prefs/migrations/0001_danmaku_pref.sql"
  - path: "services/danmaku/prefs/tests/prefs.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/danmaku/preferences"
    description:
      zh: >
          保存弹幕偏好
          
      en: >
          Save danmaku preferences
          
    input: {module: "bili.danmaku.prefs", name: "DanmakuPreference"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/danmaku/block-rules"
    description:
      zh: >
          新增屏蔽规则
          
      en: >
          Add block rule
          
    input: {module: "bili.danmaku.prefs", name: "DanmakuBlockRule"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: PUT
    path: "/api/v1/danmaku/up-policy/{videoId}"
    description:
      zh: >
          UP 主设置视频弹幕策略
          
      en: >
          Set up-owner policy
          
    input: {module: "bili.danmaku.prefs", name: "UpDanmakuPolicy"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/danmaku/{id}/ban"
    description:
      zh: >
          UP 主删除并禁言
          
      en: >
          Delete and mute author
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "danmaku_block_rule"
    description:
      zh: >
          屏蔽规则表（唯一写入所有者：弹幕偏好服务）
          
      en: >
          danmaku_block_rule table
          
types:
  - name: "DanmakuPreference"
    description: {zh: "弹幕偏好", en: "Danmaku preference"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 danmaku_preference","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"opacityPercent":{"type":"integer","description":"不透明度","minimum":0,"maximum":100},"displayAreaPercent":{"type":"integer","description":"显示区域占比","minimum":25,"maximum":100},"scrollSpeedFactor":{"type":"integer","description":"滚动速度系数 ×100","minimum":50,"maximum":200},"fontFamily":{"type":"string","description":"字体"},"fontScalePercent":{"type":"integer","description":"字号缩放","minimum":50,"maximum":200},"blockScroll":{"type":"boolean","description":"屏蔽滚动弹幕"},"blockTop":{"type":"boolean","description":"屏蔽顶部弹幕"},"blockBottom":{"type":"boolean","description":"屏蔽底部弹幕"},"blockColorful":{"type":"boolean","description":"屏蔽彩色弹幕"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","opacityPercent","displayAreaPercent"]}
  - name: "DanmakuBlockRule"
    description: {zh: "屏蔽规则", en: "Block rule"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 danmaku_block_rule，规则在服务端与客户端同时生效","properties":{"ruleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["keyword","regex","user","pool","colorful"],"description":"类型"},"value":{"type":"string","description":"规则值"},"scope":{"type":"string","enum":["global","per_video"],"description":"范围"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"enabled":{"type":"boolean","description":"是否启用"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ruleId","userId","type","value","enabled"]}
  - name: "UpDanmakuPolicy"
    description: {zh: "UP 主弹幕策略", en: "Up-owner danmaku policy"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 up_danmaku_policy，唯一约束 video_id","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"blockKeywords":{"type":"array","description":"视频级屏蔽词","items":{"type":"string","description":"关键词"}},"requireReview":{"type":"boolean","description":"是否开启先审后发"},"mutedUserIds":{"type":"array","description":"禁言用户","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"hideAll":{"type":"boolean","description":"是否关闭全部弹幕"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["videoId","ownerId","requireReview"]}
deps:
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/danmaku/block-rules"
    to_api: "GET /api/v1/users/{userId}"
    label: {zh: "读取黑名单", en: "Read blacklist"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "规则变更事件", en: "Rule change events"}
---
