---
uid: 763f5641
id: data.media.t-115f4cef
parent: data.media
state: planned
tags: ["worker:med-processing", "projection:data-contract"]
name: {zh: "MediaPipelineState", en: "MediaPipelineState"}
description:
  zh: >
      媒体处理流水线状态
  en: >
      Media pipeline state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/media/t-115f4cef.json"
apis: []
types:
  - name: "MediaPipelineState"
    description: {zh: "媒体处理流水线状态", en: "Media pipeline state"}
    schema: {"type":"object","additionalProperties":false,"description":"媒体状态机，与审核状态机、发布状态机相互独立","properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"probeState":{"type":"string","enum":["pending","running","done","failed"],"description":"探测状态"},"transcodeState":{"type":"string","enum":["pending","running","done","failed","partial"],"description":"转码状态"},"subtitleState":{"type":"string","enum":["pending","running","done","failed","skipped"],"description":"字幕状态"},"artworkState":{"type":"string","enum":["pending","running","done","failed"],"description":"封面状态"},"overall":{"type":"string","enum":["processing","ready","partial_ready","failed"],"description":"总体"},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["videoId","overall","updatedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
