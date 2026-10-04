---
uid: 5d431a6c
id: data.live.t-f7be457c
parent: data.live
state: planned
tags: ["worker:live-replay", "projection:data-contract"]
name: {zh: "LiveReplay", en: "LiveReplay"}
description:
  zh: >
      直播回放
  en: >
      Live replay
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-f7be457c.json"
apis: []
types:
  - name: "LiveReplay"
    description: {zh: "直播回放", en: "Live replay"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_replay；媒体二进制存 OSS","properties":{"replayId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"anchorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"title":{"type":"string","description":"回放标题","maxLength":80},"state":{"type":"string","enum":["recording","archiving","transcoding","ready","failed","deleted"],"description":"状态机"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"recordedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"renditions":{"type":"array","description":"档位","items":{"type":"string","description":"档位 id"}},"coverAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"sourceAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"retentionDays":{"type":"integer","description":"保留天数","minimum":0}},"required":["replayId","roomId","anchorId","state","recordedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
