---
uid: c642e91a
id: bili.media.audio
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "音轨处理", en: "Audio track processing"}
description:
  zh: >
      多音轨识别、响度归一、无损音轨与默认轨
  en: >
      Multi-track detection, loudness normalization, lossless tracks and default track
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/audio/src/audio.ts"
  - path: "services/media/audio/tests/audio.test.ts"
apis:
  - protocol: rpc
    path: "media.audio.normalize"
    description:
      zh: >
          响度归一
      en: >
          Normalize loudness
    input: {module: "bili.media.audio", name: "AudioNormalizeRequest"}
    output: {module: "bili.media.audio", name: "AudioNormalizeRequest"}
types:
  - name: "AudioNormalizeRequest"
    description: {zh: "响度归一请求", en: "Loudness normalize request"}
    schema: {"type":"object","description":"响度归一请求 / Loudness normalize request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"targetLufs":{"type":"number","description":"字段 targetLufs（语义见对应领域契约） / Field targetLufs"},"trackIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 trackIds（语义见对应领域契约） / Field trackIds"}},"required":["assetId","targetLufs","trackIds"]}
deps:
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
