---
uid: baecdc27
id: bili.playback.stream
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "流地址与清晰度选择", en: "Stream urls and quality selection"}
description:
  zh: >
      按授权签发 CDN 签名地址、清晰度/音轨/字幕切换与防盗链
  en: >
      Sign CDN urls under a grant and switch quality, audio track and subtitles with anti-leech
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/stream/src/stream.ts"
  - path: "services/playback/stream/tests/stream.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/playback/streams"
    description:
      zh: >
          获取播放地址
      en: >
          Get stream urls
    input: {module: "bili.playback.stream", name: "StreamRequest"}
    output: {module: "bili.playback.stream", name: "StreamPlaylist"}
types:
  - name: "StreamPlaylist"
    description: {zh: "播放列表", en: "Stream playlist"}
    schema: {"type":"object","description":"播放列表 / Stream playlist","additionalProperties":false,"properties":{"grantId":{"$ref":"urn:normify:bili.contract.common:Id","description":"播放授权 ID / Playback grant id"},"qualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"清晰度档位 ID / Quality tier id"},"playUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 playUrl（语义见对应领域契约） / Field playUrl"},"backupUrls":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 backupUrls（语义见对应领域契约） / Field backupUrls"},"subtitles":{"type":"array","items":{"$ref":"urn:normify:bili.media.asset:SubtitleTrack"},"description":"字段 subtitles（语义见对应领域契约） / Field subtitles"},"audioTracks":{"type":"array","items":{"$ref":"urn:normify:bili.media.asset:AudioTrackView"},"description":"字段 audioTracks（语义见对应领域契约） / Field audioTracks"}},"required":["grantId","qualityId","playUrl","backupUrls","subtitles","audioTracks"]}
  - name: "StreamRequest"
    description: {zh: "播放地址请求", en: "Stream request"}
    schema: {"type":"object","description":"播放地址请求 / Stream request","additionalProperties":false,"properties":{"grantId":{"$ref":"urn:normify:bili.contract.common:Id","description":"播放授权 ID / Playback grant id"},"qualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"清晰度档位 ID / Quality tier id"},"subtitleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字幕 ID / Subtitle id"},"audioTrackId":{"$ref":"urn:normify:bili.contract.common:Id","description":"音轨 ID / Audio track id"}},"required":["grantId"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "读取转码产物与字幕", en: "Read transcode artifacts and"}
  - kind: call
    to: bili.infra.cdn
    label: {zh: "签名 CDN 地址与刷新", en: "Sign CDN urls and purge"}
  - kind: call
    to: bili.playback.grant
    from_api: "GET /api/v1/playback/streams"
    to_api: "POST /api/v1/playback/grants/verification"
    label: {zh: "校验授权有效性", en: "Validate the playback grant"}
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
