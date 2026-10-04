---
uid: f635910a
id: bili.danmaku.stream
parent: bili.danmaku
state: planned
tags: ["worker:dm-stream"]
name: {zh: "弹幕池与分时段读取", en: "Danmaku Pool and Segments"}
description:
  zh: >
      按 6 分钟分片读取、按时间点增量拉取、活跃弹幕池内存缓存与实时广播主题；读取侧不可写。
      
  en: >
      Six-minute segment fetch, incremental pull by timestamp, active pool caching and broadcast topic.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/stream/src/segment.ts"
  - path: "services/danmaku/stream/src/pool.ts"
  - path: "services/danmaku/stream/tests/segment.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/danmaku/{videoId}/segments"
    description:
      zh: >
          按分片读取弹幕
          
      en: >
          Fetch danmaku segment
          
    input: {module: "bili.danmaku.stream", name: "DanmakuSegmentRequest"}
    output: {module: "bili.danmaku.stream", name: "DanmakuSegment"}
  - protocol: http
    method: GET
    path: "/api/v1/danmaku/{videoId}/segments/{index}"
    description:
      zh: >
          读取指定分片（可缓存）
          
      en: >
          Fetch indexed segment
          
    output: {module: "bili.danmaku.stream", name: "DanmakuSegment"}
  - protocol: amqp
    path: "danmaku.broadcast"
    description:
      zh: >
          实时弹幕广播主题（当前经 outbox 派发）
          
      en: >
          Realtime danmaku topic
          
    input: {module: "bili.danmaku.stream", name: "DanmakuEntry"}
types:
  - name: "DanmakuEntry"
    description: {zh: "弹幕条目", en: "Danmaku entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 danmaku，索引 video_id+time_ms；只读接口不返回被屏蔽弹幕","properties":{"danmakuId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"文本内容","minLength":1,"maxLength":100},"timeMs":{"type":"integer","description":"相对视频时间毫秒","minimum":0},"mode":{"type":"string","enum":["scroll","top","bottom","reverse"],"description":"模式"},"fontSize":{"type":"string","enum":["small","medium","large"],"description":"字号"},"colorHex":{"type":"string","description":"颜色 #RRGGBB","pattern":"^#[0-9a-fA-F]{6}$"},"pool":{"type":"string","enum":["normal","subtitle","special","code"],"description":"池"},"state":{"type":"string","enum":["visible","blocked","deleted","under_review"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["danmakuId","videoId","timeMs","content","mode","pool","state"]}
  - name: "DanmakuSegmentRequest"
    description: {zh: "分片拉取请求", en: "Segment fetch request"}
    schema: {"type":"object","additionalProperties":false,"description":"分片是稳定契约：同分片内容可缓存在边缘节点","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"segmentIndex":{"type":"integer","description":"第几个分片（6 分钟一段）","minimum":0},"sinceMs":{"type":"integer","description":"增量起点毫秒","minimum":0},"limit":{"type":"integer","description":"返回上限","minimum":1,"maximum":6000}},"required":["videoId","segmentIndex"]}
  - name: "DanmakuSegment"
    description: {zh: "弹幕分片", en: "Danmaku segment"}
    schema: {"type":"object","additionalProperties":false,"description":"可由缓存/CDN 提供，不保证强一致","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"segmentIndex":{"type":"integer","description":"分片序号","minimum":0},"startMs":{"type":"integer","description":"分片起点毫秒","minimum":0},"endMs":{"type":"integer","description":"分片终点毫秒","minimum":0},"entries":{"type":"array","description":"弹幕条目","items":{"$ref":"urn:normify:bili.danmaku.stream:DanmakuEntry"}},"generatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"cacheTtlSeconds":{"type":"integer","description":"可缓存秒数","minimum":0}},"required":["videoId","segmentIndex","entries"]}
deps:
  - kind: call
    to: bili.infra.cache
    label: {zh: "分片与活跃池缓存", en: "Segment and hot pool cache"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "只服务已发布视频", en: "Only published videos"}
  - kind: call
    to: bili.danmaku.prefs
    from_api: "GET /api/v1/danmaku/{videoId}/segments"
    label: {zh: "应用屏蔽与偏好过滤", en: "Apply block rules"}
---
