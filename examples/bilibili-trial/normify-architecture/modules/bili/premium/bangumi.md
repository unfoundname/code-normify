---
uid: 9315c1e5
id: bili.premium.bangumi
parent: bili.premium
state: planned
tags: ["worker:pm-bangumi"]
name: {zh: "番剧、国创与影视", en: "Anime, Guochuang and Film"}
description:
  zh: >
      内容条目与系列/季/剧集层级、分集资产与角标、上线与完结状态、标签与评分聚合。
      
  en: >
      Titles with series/season/episode hierarchy, episode assets and badges, lifecycle state, tags and rating aggregate.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/premium/bangumi/src/season.ts"
  - path: "services/premium/bangumi/src/episode.ts"
  - path: "services/premium/bangumi/migrations/0001_season.sql"
  - path: "services/premium/bangumi/tests/season.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/seasons"
    description:
      zh: >
          按类型列出剧集
          
      en: >
          List seasons
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.premium.bangumi", name: "SeasonRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/seasons/{id}"
    description:
      zh: >
          读取剧集详情
          
      en: >
          Get season
          
    output: {module: "bili.premium.bangumi", name: "SeasonRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/seasons/{id}/episodes"
    description:
      zh: >
          列出分集
          
      en: >
          List episodes
          
    output: {module: "bili.premium.bangumi", name: "EpisodeRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/series/{id}"
    description:
      zh: >
          读取系列
          
      en: >
          Get series
          
    output: {module: "bili.premium.bangumi", name: "SeriesRecord"}
  - protocol: mysql
    path: "season_episode"
    description:
      zh: >
          分集表（唯一写入所有者：番剧服务）
          
      en: >
          episode table
          
types:
  - name: "SeasonRecord"
    description: {zh: "剧集/番剧", en: "Season"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season；评分聚合为投影","properties":{"seasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["bangumi","guochuang","movie","tv","variety","documentary","academic"],"description":"类型"},"title":{"type":"string","description":"标题","maxLength":120},"originalTitle":{"type":"string","description":"原名"},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"description":{"type":"string","description":"简介","maxLength":2000},"parentSeasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"totalEpisodes":{"type":"integer","description":"总集数","minimum":0},"state":{"type":"string","enum":["upcoming","airing","finished","offline","copyright_expired"],"description":"状态机"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20}},"ratingAverage":{"type":"integer","description":"平均分 ×10","minimum":0,"maximum":100},"ratingCount":{"type":"integer","description":"评分人数（投影）","minItems":0,"minimum":0},"releaseYear":{"type":"integer","description":"年份","minimum":1900,"maximum":2100}},"required":["seasonId","type","title","state"]}
  - name: "EpisodeRecord"
    description: {zh: "剧集分集", en: "Episode"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season_episode，唯一约束 season_id+episode_index","properties":{"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"seasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeIndex":{"type":"integer","description":"集号","minimum":0},"title":{"type":"string","description":"分集标题","maxLength":120},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"subtitleTrackIds":{"type":"array","description":"字幕轨","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["pending","ready","aired","locked","offline"],"description":"状态机"},"airAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"accessBadge":{"type":"string","enum":["free","vip","preview","paid","region_limited"],"description":"观看角标"},"previewSeconds":{"type":"integer","description":"试看秒数","minimum":0}},"required":["episodeId","seasonId","episodeIndex","title","state","accessBadge"]}
  - name: "SeriesRecord"
    description: {zh: "系列", en: "Series"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 series，series_member 关联表显式建模","properties":{"seriesId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"系列标题","maxLength":120},"seasonIds":{"type":"array","description":"季","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"description":{"type":"string","description":"简介","maxLength":1000},"orderIndex":{"type":"integer","description":"排序","minimum":0}},"required":["seriesId","title","seasonIds"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "分集资产引用媒体原件", en: "Episodes reference media asset"}
  - kind: call
    to: bili.premium.entitlement
    label: {zh: "分集权益与地域规则", en: "Episode entitlement rules"}
  - kind: call
    to: bili.contract.media.playback
    label: {zh: "播放经统一授权", en: "Playback via unified grant"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "上线/分集事件驱动追番通知", en: "Airing events"}
---
