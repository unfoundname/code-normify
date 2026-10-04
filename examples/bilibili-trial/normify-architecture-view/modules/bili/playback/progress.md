---
uid: 2b251d2f
id: bili.playback.progress
parent: bili.playback
state: planned
tags: ["worker:play-progress"]
name: {zh: "观看历史与稍后再看", en: "History and Watch Later"}
description:
  zh: >
      进度上报（节流+幂等）、跨设备续播、观看历史、稍后再看与清理策略。
      
  en: >
      Throttled idempotent progress reporting, cross-device resume, history, watch later and cleanup.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/progress/src/progress.ts"
  - path: "services/playback/progress/src/watch-later.ts"
  - path: "services/playback/progress/migrations/0001_progress.sql"
  - path: "services/playback/progress/tests/progress.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/playback/progress"
    description:
      zh: >
          上报观看进度（幂等+节流）
          
      en: >
          Report watch progress
          
    input: {module: "bili.playback.progress", name: "WatchProgress"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/playback/history"
    description:
      zh: >
          列出观看历史
          
      en: >
          List watch history
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.playback.progress", name: "WatchProgress"}
  - protocol: http
    method: GET
    path: "/api/v1/playback/watch-later"
    description:
      zh: >
          列出稍后再看
          
      en: >
          List watch later
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.playback.progress", name: "WatchLaterItem"}
  - protocol: http
    method: POST
    path: "/api/v1/playback/watch-later"
    description:
      zh: >
          加入稍后再看
          
      en: >
          Add to watch later
          
    input: {module: "bili.playback.progress", name: "WatchLaterItem"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "watch_progress"
    description:
      zh: >
          观看进度表（唯一写入所有者：进度服务）
          
      en: >
          watch_progress table
          
types:
  - name: "WatchProgress"
    description: {zh: "观看进度", en: "Watch progress"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 watch_progress，唯一约束 user_id+video_id+episode_id；写操作按 last_write_wins 合并","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"positionMs":{"type":"integer","description":"播放位置毫秒","minimum":0},"durationMs":{"type":"integer","description":"总时长毫秒","minimum":0},"completed":{"type":"boolean","description":"是否播完"},"deviceId":{"type":"string","description":"设备标识"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","videoId","positionMs","updatedAt"]}
  - name: "WatchHistoryEntry"
    description: {zh: "观看历史条目", en: "Watch history entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 watch_history，索引 user_id+watched_at","properties":{"entryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"positionMs":{"type":"integer","description":"位置毫秒","minimum":0},"watchedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"hidden":{"type":"boolean","description":"是否已从历史隐藏"}},"required":["entryId","userId","videoId","watchedAt"]}
  - name: "WatchLaterItem"
    description: {zh: "稍后再看条目", en: "Watch later item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 watch_later，唯一约束 user_id+video_id，容量上限由策略约束","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"addedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["itemId","userId","videoId","addedAt"]}
deps:
  - kind: call
    to: bili.playback.grant
    from_api: "POST /api/v1/playback/progress"
    to_api: "POST /api/v1/playback/grants"
    label: {zh: "上报前进度需持有有效票据", en: "Requires valid grant"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "进度完成事件驱动推荐与统计", en: "Progress events feed ranking"}
  - kind: reference
    to: bili.publish.catalog
    label: {zh: "只对已发布视频记录进度", en: "Progress only for published vi"}
---
