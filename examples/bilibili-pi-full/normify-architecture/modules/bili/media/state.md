---
uid: afd25a2d
id: bili.media.state
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "媒体处理状态机", en: "Media process state machine"}
description:
  zh: >
      UPLOADED→PROBING→TRANSCODING→READY 的唯一迁移入口
  en: >
      The only transition entry for UPLOADED, PROBING, TRANSCODING, READY and failure states
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/state/src/media-state.ts"
  - path: "services/media/state/tests/media-state.test.ts"
apis:
  - protocol: rpc
    path: "media.state.transition"
    description:
      zh: >
          迁移媒体状态
      en: >
          Transition media state
    input: {module: "bili.media.state", name: "MediaTransitionRequest"}
    output: {module: "bili.contract.state", name: "MediaProcessState"}
types:
  - name: "MediaTransitionRequest"
    description: {zh: "媒体状态迁移请求", en: "Media transition request"}
    schema: {"type":"object","description":"媒体状态迁移请求 / Media transition request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"toState":{"$ref":"urn:normify:bili.contract.state:MediaProcessState","description":"字段 toState（语义见对应领域契约） / Field toState"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"}},"required":["assetId","toState","idempotencyKey"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "更新资源处理状态字段", en: "Update the asset processing"}
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
