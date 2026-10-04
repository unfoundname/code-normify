---
uid: b528f6d4
id: bili.danmaku.post
parent: bili.danmaku
state: planned
tags: ["worker:dm-post"]
name: {zh: "弹幕发送与风控", en: "Danmaku Posting"}
description:
  zh: >
      发送、样式与池选择、频控与敏感词、重复弹幕合并、举报入口；所有写入带幂等键。
      
  en: >
      Post, style and pool selection, rate limits and sensitive words, duplicate merge, report entry.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/post/src/service.ts"
  - path: "services/danmaku/post/src/moderation.ts"
  - path: "services/danmaku/post/migrations/0001_danmaku.sql"
  - path: "services/danmaku/post/tests/post.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/danmaku"
    description:
      zh: >
          发送弹幕
          
      en: >
          Post danmaku
          
    input: {module: "bili.danmaku.post", name: "DanmakuPostRequest"}
    output: {module: "bili.danmaku.stream", name: "DanmakuEntry"}
  - protocol: http
    method: POST
    path: "/api/v1/danmaku/{id}/report"
    description:
      zh: >
          举报弹幕
          
      en: >
          Report danmaku
          
    input: {module: "bili.danmaku.post", name: "DanmakuReport"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/danmaku/post-policy"
    description:
      zh: >
          读取发送策略
          
      en: >
          Read posting policy
          
    output: {module: "bili.danmaku.post", name: "DanmakuPostPolicy"}
  - protocol: mysql
    path: "danmaku"
    description:
      zh: >
          弹幕表（唯一写入所有者：弹幕发送服务）
          
      en: >
          danmaku table
          
types:
  - name: "DanmakuPostRequest"
    description: {zh: "弹幕发送请求", en: "Danmaku post request"}
    schema: {"type":"object","additionalProperties":false,"description":"客户端 60 秒内重复内容由服务端合并","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"文本内容","minLength":1,"maxLength":100},"timeMs":{"type":"integer","description":"相对时间毫秒","minimum":0},"mode":{"type":"string","enum":["scroll","top","bottom","reverse"],"description":"模式"},"fontSize":{"type":"string","enum":["small","medium","large"],"description":"字号"},"colorHex":{"type":"string","description":"颜色","pattern":"^#[0-9a-fA-F]{6}$"},"pool":{"type":"string","enum":["normal","subtitle","special"],"description":"池"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["videoId","content","timeMs","mode","idempotencyKey"]}
  - name: "DanmakuPostPolicy"
    description: {zh: "弹幕发送策略", en: "Danmaku posting policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"maxLength":{"type":"integer","description":"最大长度","minimum":1,"maximum":200},"minIntervalMs":{"type":"integer","description":"最小发送间隔毫秒","minimum":0},"dailyQuota":{"type":"integer","description":"每日配额","minimum":0},"needLogin":{"type":"boolean","description":"是否必须登录"},"needRealName":{"type":"boolean","description":"是否必须实名"},"sensitiveWordVersion":{"type":"string","description":"敏感词库版本"},"requiresReview":{"type":"boolean","description":"命中风控是否转人工审核"}},"required":["maxLength","minIntervalMs","dailyQuota","needRealName"]}
  - name: "DanmakuReport"
    description: {zh: "弹幕举报", en: "Danmaku report"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 danmaku_report，唯一约束 danmaku_id+reporter_id","properties":{"reportId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"danmakuId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reporterId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reportedAuthorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reasonCode":{"type":"string","enum":["abuse","spam","spoiler","illegal","advertisement","other"],"description":"原因码"},"state":{"type":"string","enum":["submitted","reviewing","accepted","rejected"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"handledBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["reportId","danmakuId","reporterId","reasonCode","state"]}
deps:
  - kind: call
    to: bili.danmaku.stream
    from_api: "POST /api/v1/danmaku"
    label: {zh: "写入后进入弹幕池与广播", en: "Feed pool and broadcast"}
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/danmaku"
    label: {zh: "黑名单与隐私校验", en: "Blacklist check"}
  - kind: call
    to: bili.identity.verify
    label: {zh: "未成年人弹幕限制", en: "Minor posting limits"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "弹幕审核与计数事件", en: "Danmaku audit and count events"}
---
