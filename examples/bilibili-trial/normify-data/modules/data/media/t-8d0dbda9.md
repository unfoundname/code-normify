---
uid: 51350a09
id: data.media.t-8d0dbda9
parent: data.media
state: planned
tags: ["worker:med-processing", "projection:data-contract"]
name: {zh: "TranscodeJobRequest", en: "TranscodeJobRequest"}
description:
  zh: >
      转码任务请求
  en: >
      Transcode job request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/media/t-8d0dbda9.json"
apis: []
types:
  - name: "TranscodeJobRequest"
    description: {zh: "转码任务请求", en: "Transcode job request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"profiles":{"type":"array","description":"目标档位","items":{"$ref":"urn:normify:data.contract.t-30876879:RenditionSpec"},"minItems":1},"priority":{"type":"integer","description":"优先级","minimum":0,"maximum":9},"generatePreview":{"type":"boolean","description":"是否生成预览图"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["videoId","assetId","profiles","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-30876879
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
