---
uid: b09ac3da
id: bili.playback.sequence
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "连续播放与自动下一集", en: "Continuous playback and auto-next"}
description:
  zh: >
      播放列表续接、合集连播、自动下一分 P 与剧集
  en: >
      Playlist continuation, collection autoplay, next part and next episode
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/sequence/src/sequence.ts"
  - path: "services/playback/sequence/tests/sequence.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/playback/sequences"
    description:
      zh: >
          获取连续播放序列
      en: >
          Get a play sequence
    output: {module: "bili.playback.sequence", name: "PlaySequence"}
types:
  - name: "PlaySequence"
    description: {zh: "播放序列", en: "Play sequence"}
    schema: {"type":"object","description":"播放序列 / Play sequence","additionalProperties":false,"properties":{"sequenceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 sequenceId（语义见对应领域契约） / Field sequenceId"},"rootResourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 rootResourceId（语义见对应领域契约） / Field rootResourceId"},"resourceIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 resourceIds（语义见对应领域契约） / Field resourceIds"},"currentIndex":{"type":"integer","description":"字段 currentIndex（语义见对应领域契约） / Field currentIndex"}},"required":["sequenceId","rootResourceId","resourceIds","currentIndex"]}
deps:
  - kind: call
    to: bili.pgc.series
    label: {zh: "剧集与季的顺序", en: "Episode and season ordering"}
  - kind: call
    to: bili.catalog.query
    label: {zh: "合集内视频顺序", en: "Video ordering within a"}
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
