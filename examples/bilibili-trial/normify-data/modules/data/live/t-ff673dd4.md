---
uid: 24c50a51
id: data.live.t-ff673dd4
parent: data.live
state: planned
tags: ["worker:live-replay", "projection:data-contract"]
name: {zh: "ReplayClipRequest", en: "ReplayClipRequest"}
description:
  zh: >
      回放裁剪请求
  en: >
      Replay clip request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-ff673dd4.json"
apis: []
types:
  - name: "ReplayClipRequest"
    description: {zh: "回放裁剪请求", en: "Replay clip request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"replayId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"startMs":{"type":"integer","description":"起点毫秒","minimum":0},"endMs":{"type":"integer","description":"终点毫秒","minimum":1},"title":{"type":"string","description":"片段标题","maxLength":80},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["replayId","startMs","endMs","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
