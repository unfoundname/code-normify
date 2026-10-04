---
uid: 77e99cf6
id: bili.playback.detail
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "播放详情聚合", en: "Playback detail aggregation"}
description:
  zh: >
      详情页聚合：视频、UP 主、统计、相关推荐与播放器初始参数
  en: >
      Detail aggregation: video, uploader, stats, related items and initial player parameters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/detail/src/detail.ts"
  - path: "services/playback/detail/tests/detail.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/playback/detail/:bvid"
    description:
      zh: >
          按 BV 号查询播放详情（前端播放页消费）
      en: >
          Get playback detail by BV id (consumed by the web playback page)
    input: {module: "bili.playback.detail", name: "PlaybackDetailQueryRequest"}
    output: {module: "bili.playback.detail", name: "PlaybackDetailView"}
types:
  - name: "PlaybackDetailView"
    description: {zh: "播放详情视图", en: "Playback detail view"}
    schema: {"type":"object","description":"播放详情视图 / Playback detail view","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"description":{"type":"string","minLength":1,"description":"字段 description（语义见对应领域契约） / Field description"},"uploader":{"$ref":"urn:normify:bili.identity.profile:ProfileView","description":"字段 uploader（语义见对应领域契约） / Field uploader"},"stats":{"$ref":"urn:normify:bili.community.like:InteractionStats","description":"字段 stats（语义见对应领域契约） / Field stats"},"qualityIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 qualityIds（语义见对应领域契约） / Field qualityIds"},"grant":{"$ref":"urn:normify:bili.contract.state:PlaybackGrant","description":"字段 grant（语义见对应领域契约） / Field grant"}},"required":["bvid","title","description","uploader","stats","qualityIds","grant"]}
  - name: "PlaybackDetailQueryRequest"
    description: {zh: "播放详情查询请求", en: "Playback detail query request"}
    schema: {"type":"object","description":"播放详情查询请求 / Playback detail query request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"}},"required":["bvid"]}
deps:
  - kind: call
    to: bili.catalog.query
    label: {zh: "目录卡片与统计投影", en: "Catalog cards and stat"}
  - kind: call
    to: bili.playback.grant
    from_api: "GET /api/v1/playback/detail/:bvid"
    to_api: "POST /api/v1/playback/grants"
    label: {zh: "签发统一播放授权", en: "Issue the unified playback"}
  - kind: call
    to: bili.discover.recommend
    label: {zh: "相关推荐", en: "Related recommendations"}
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
