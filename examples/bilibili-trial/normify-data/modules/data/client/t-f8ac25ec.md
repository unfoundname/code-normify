---
uid: 9ed8ddd7
id: data.client.t-f8ac25ec
parent: data.client
state: planned
tags: ["worker:web-live", "projection:data-contract"]
name: {zh: "AnchorConsoleState", en: "AnchorConsoleState"}
description:
  zh: >
      主播控制台状态
  en: >
      Anchor console state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-f8ac25ec.json"
apis: []
types:
  - name: "AnchorConsoleState"
    description: {zh: "主播控制台状态", en: "Anchor console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"qualification":{"$ref":"urn:normify:data.live.t-f65042f6:AnchorQualification"},"room":{"$ref":"urn:normify:data.live.t-dd64b759:LiveRoom"},"streamTicket":{"$ref":"urn:normify:data.live.t-35192572:LiveStreamTicket"},"bitrateKbps":{"type":"integer","description":"当前上行码率","minimum":0},"droppedFrames":{"type":"integer","description":"丢帧数","minimum":0},"policy":{"$ref":"urn:normify:data.live.t-f6278ddb:LiveDanmakuPolicy"}},"required":["room","bitrateKbps"]}
deps:
  - kind: reference
    to: data.live.t-f65042f6
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.live.t-dd64b759
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.live.t-35192572
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.live.t-f6278ddb
    label: {zh: "类型引用", en: "Type reference"}
---
