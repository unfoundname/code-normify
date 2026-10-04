---
uid: 80cf1d55
id: bili.playback.detail
parent: bili.playback
state: planned
tags: ["worker:play-detail"]
name: {zh: "详情页与连续播放", en: "Detail Page and Autoplay"}
description:
  zh: >
      详情页聚合（视频/UP 主/统计/字幕/相关推荐）、播放偏好、连续播放队列与全屏/倍速设置持久化。
      
  en: >
      Detail aggregation, playback preferences, autoplay queue and persisted fullscreen/speed settings.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/detail/src/detail.ts"
  - path: "services/playback/detail/src/autoplay.ts"
  - path: "services/playback/detail/migrations/0001_preference.sql"
  - path: "services/playback/detail/tests/detail.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/videos/{videoId}/detail"
    description:
      zh: >
          读取视频详情聚合
          
      en: >
          Get video detail
          
    output: {module: "bili.playback.detail", name: "VideoDetailView"}
  - protocol: http
    method: GET
    path: "/api/v1/videos/{videoId}/autoplay-queue"
    description:
      zh: >
          生成连续播放队列
          
      en: >
          Build autoplay queue
          
    output: {module: "bili.playback.detail", name: "AutoplayQueue"}
  - protocol: http
    method: PUT
    path: "/api/v1/playback/preferences"
    description:
      zh: >
          保存播放偏好
          
      en: >
          Save playback preferences
          
    input: {module: "bili.playback.detail", name: "PlaybackPreference"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "playback_preference"
    description:
      zh: >
          播放偏好表（唯一写入所有者：详情服务）
          
      en: >
          playback_preference table
          
types:
  - name: "VideoDetailView"
    description: {zh: "视频详情聚合视图", en: "Video detail view"}
    schema: {"type":"object","additionalProperties":false,"description":"只读聚合视图，跨域数据一律通过领域 API 或事件投影获取","properties":{"video":{"$ref":"urn:normify:bili.publish.catalog:CatalogVideo"},"owner":{"$ref":"urn:normify:bili.identity.profile:UserProfile"},"stats":{"type":"object","additionalProperties":false,"description":"事件投影计数，非权威列","properties":{"viewCount":{"type":"integer","description":"播放量","minimum":0},"danmakuCount":{"type":"integer","description":"弹幕数","minimum":0},"commentCount":{"type":"integer","description":"评论数","minimum":0},"likeCount":{"type":"integer","description":"点赞数","minimum":0},"coinCount":{"type":"integer","description":"投币数","minimum":0},"favoriteCount":{"type":"integer","description":"收藏数","minimum":0},"shareCount":{"type":"integer","description":"分享数","minimum":0}},"required":["viewCount","danmakuCount"]},"subtitleTracks":{"type":"array","description":"字幕轨","items":{"$ref":"urn:normify:bili.media.artwork:SubtitleTrack"}},"episodes":{"type":"array","description":"分 P","items":{"$ref":"urn:normify:bili.publish.collection:EpisodeBinding"}},"collections":{"type":"array","description":"所属合集","items":{"$ref":"urn:normify:bili.publish.collection:CollectionRecord"}},"relatedVideoIds":{"type":"array","description":"相关推荐 id","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"projectionLagSeconds":{"type":"integer","description":"投影滞后秒","minimum":0}},"required":["video","owner","stats"]}
  - name: "PlaybackPreference"
    description: {zh: "播放偏好", en: "Playback preference"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 playback_preference","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"preferredQuality":{"type":"string","description":"偏好清晰度"},"subtitleLang":{"type":"string","description":"偏好字幕语言"},"playbackRate":{"type":"integer","description":"默认倍速 ×100","minimum":50,"maximum":400},"danmakuEnabled":{"type":"boolean","description":"是否默认开启弹幕"},"autoNext":{"type":"boolean","description":"是否自动连播"},"rememberPosition":{"type":"boolean","description":"是否记忆进度"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","preferredQuality","playbackRate"]}
  - name: "AutoplayQueue"
    description: {zh: "连续播放队列", en: "Autoplay queue"}
    schema: {"type":"object","additionalProperties":false,"description":"实时生成，不落库","properties":{"sourceVideoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"items":{"type":"array","description":"队列项","items":{"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reason":{"type":"string","enum":["same_collection","same_owner","related","history"],"description":"来源"},"orderIndex":{"type":"integer","description":"序号","minimum":0}},"required":["videoId","reason","orderIndex"]}},"generatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["sourceVideoId","items"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "GET /api/v1/videos/{videoId}/detail"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "读取目录视频与分档", en: "Read catalog video"}
  - kind: call
    to: bili.identity.profile
    label: {zh: "读取 UP 主资料", en: "Read owner profile"}
  - kind: call
    to: bili.media.artwork
    from_api: "GET /api/v1/videos/{videoId}/detail"
    to_api: "GET /api/v1/media/videos/{videoId}/subtitle-tracks"
    label: {zh: "读取字幕轨", en: "Read subtitle tracks"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "统计计数为事件投影", en: "Counters are projections"}
  - kind: reference
    to: bili.contract.media.playback
    label: {zh: "详情页播放入口消费票据", en: "Detail consumes grant"}
---
