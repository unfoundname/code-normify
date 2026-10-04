---
uid: 3f382352
id: bili.media.probe
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "媒体探测", en: "Media probing"}
description:
  zh: >
      容器/编码/时长/轨道/分辨率探测与异常隔离
  en: >
      Container, codec, duration, track and resolution probing with quarantine
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/probe/src/probe.ts"
  - path: "services/media/probe/tests/probe.test.ts"
apis:
  - protocol: rpc
    path: "media.probe.run"
    description:
      zh: >
          执行探测
      en: >
          Run probing
    input: {module: "bili.media.storage", name: "ObjectRef"}
    output: {module: "bili.media.probe", name: "ProbeResult"}
types:
  - name: "ProbeResult"
    description: {zh: "探测结果", en: "Probe result"}
    schema: {"type":"object","description":"探测结果 / Probe result","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"width":{"type":"integer","description":"宽（像素） / Width in pixels"},"height":{"type":"integer","description":"高（像素） / Height in pixels"},"codec":{"type":"string","minLength":1,"description":"编码格式 / Codec"},"audioTracks":{"type":"array","items":{"$ref":"urn:normify:bili.media.asset:AudioTrackView"},"description":"字段 audioTracks（语义见对应领域契约） / Field audioTracks"},"warnings":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 warnings（语义见对应领域契约） / Field warnings"}},"required":["assetId","durationMs","width","height","codec","audioTracks","warnings"]}
deps:
  - kind: call
    to: bili.media.state
    label: {zh: "探测异常进入隔离态", en: "Move anomalies into quarantine"}
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
