---
uid: 279be039
id: bili.channel.audio
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "音频", en: "Audio channel"}
description:
  zh: >
      音频投稿、专辑、歌单与音质档位
  en: >
      Audio uploads, albums, playlists and quality tiers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/audio/src/audio.ts"
  - path: "services/channel/audio/tests/audio.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/channel/audio"
    description:
      zh: >
          创建音频
      en: >
          Create audio
    input: {module: "bili.channel.audio", name: "AudioRequest"}
    output: {module: "bili.channel.audio", name: "AudioView"}
  - protocol: http
    method: GET
    path: "/api/v1/channel/audio/"
    description:
      zh: >
          查询音频
      en: >
          Get audio
    output: {module: "bili.channel.audio", name: "AudioView"}
types:
  - name: "AudioView"
    description: {zh: "音频视图", en: "Audio view"}
    schema: {"type":"object","description":"音频视图 / Audio view","additionalProperties":false,"properties":{"audioId":{"$ref":"urn:normify:bili.contract.common:Id","description":"音频 ID / Audio id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"uploaderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"投稿用户 ID / Uploader user id"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"albumId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 albumId（语义见对应领域契约） / Field albumId"},"qualityIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 qualityIds（语义见对应领域契约） / Field qualityIds"}},"required":["audioId","title","uploaderId","durationMs","qualityIds"]}
  - name: "AudioRequest"
    description: {zh: "音频视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Audio view write request carrying only client-provided fields"}
    schema: {"type":"object","description":"音频视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Audio view write request carrying only client-provided fields","additionalProperties":false,"properties":{"audioId":{"$ref":"urn:normify:bili.contract.common:Id","description":"音频 ID / Audio id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"albumId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 albumId（语义见对应领域契约） / Field albumId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["audioId","title","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.media.ingest
    label: {zh: "音频原件进入媒体管道", en: "Audio originals enter the"}
  - kind: call
    to: bili.playback.grant
    label: {zh: "音频播放走统一授权", en: "Audio playback uses the"}
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
