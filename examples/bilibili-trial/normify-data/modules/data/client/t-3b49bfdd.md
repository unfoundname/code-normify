---
uid: e49c7bfa
id: data.client.t-3b49bfdd
parent: data.client
state: planned
tags: ["worker:web-shell", "projection:data-contract"]
name: {zh: "RealtimeFrame", en: "RealtimeFrame"}
description:
  zh: >
      实时帧
  en: >
      Realtime frame
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-3b49bfdd.json"
apis: []
types:
  - name: "RealtimeFrame"
    description: {zh: "实时帧", en: "Realtime frame"}
    schema: {"type":"object","additionalProperties":false,"properties":{"topic":{"type":"string","description":"主题"},"seq":{"type":"integer","description":"序号","minimum":0},"sentAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"payloadJson":{"type":"string","description":"载荷 JSON"}},"required":["topic","seq","sentAt","payloadJson"]}
deps:
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
