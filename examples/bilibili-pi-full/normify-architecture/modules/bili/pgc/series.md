---
uid: a8bfd0e1
id: bili.pgc.series
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "系列季与剧集", en: "Series, seasons and episodes"}
description:
  zh: >
      番剧系列、季、剧集层级、更新顺序与合集归属
  en: >
      Series, seasons, episodes, update ordering and collection membership
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/series/src/series.ts"
  - path: "services/pgc/series/tests/series.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/pgc/seasons/"
    description:
      zh: >
          查询季度
      en: >
          Get a season
    output: {module: "bili.pgc.series", name: "SeasonView"}
  - protocol: http
    method: GET
    path: "/api/v1/pgc/episodes/"
    description:
      zh: >
          查询剧集
      en: >
          Get an episode
    output: {module: "bili.pgc.series", name: "EpisodeView"}
types:
  - name: "SeasonView"
    description: {zh: "季度视图", en: "Season view"}
    schema: {"type":"object","description":"季度视图 / Season view","additionalProperties":false,"properties":{"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"kind":{"type":"string","enum":["ANIME","DOMESTIC","FILM","TV","DOCUMENTARY"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"episodeCount":{"type":"integer","description":"字段 episodeCount（语义见对应领域契约） / Field episodeCount"},"license":{"$ref":"urn:normify:bili.pgc.license:LicenseWindow","description":"字段 license（语义见对应领域契约） / Field license"},"followCount":{"type":"integer","description":"字段 followCount（语义见对应领域契约） / Field followCount"}},"required":["seasonId","title","kind","episodeCount","license","followCount"]}
  - name: "EpisodeView"
    description: {zh: "剧集视图", en: "Episode view"}
    schema: {"type":"object","description":"剧集视图 / Episode view","additionalProperties":false,"properties":{"episodeId":{"$ref":"urn:normify:bili.contract.common:Id","description":"剧集 ID / Episode id"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"publishAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 publishAt（语义见对应领域契约） / Field publishAt"},"trialSec":{"type":"integer","description":"字段 trialSec（语义见对应领域契约） / Field trialSec"}},"required":["episodeId","seasonId","index","title","durationMs"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "剧集与视频目录映射", en: "Map episodes to the video"}
  - kind: call
    to: bili.media.asset
    label: {zh: "剧集媒体资源", en: "Episode media assets"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
