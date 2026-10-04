---
uid: 86c80e8d
id: data.media.t-de3e5ce9
parent: data.media
state: planned
tags: ["worker:med-asset", "projection:data-contract"]
name: {zh: "AssetLifecycleRule", en: "AssetLifecycleRule"}
description:
  zh: >
      资产生命周期规则
  en: >
      Asset lifecycle rule
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/media/t-de3e5ce9.json"
apis: []
types:
  - name: "AssetLifecycleRule"
    description: {zh: "资产生命周期规则", en: "Asset lifecycle rule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"purpose":{"type":"string","description":"对象用途"},"retainDays":{"type":"integer","description":"保留天数","minimum":0},"archiveAfterDays":{"type":"integer","description":"转归档天数","minimum":0},"deleteOnVideoDelete":{"type":"boolean","description":"视频删除时是否级联删除"},"legalHold":{"type":"boolean","description":"是否法律保留"}},"required":["purpose","retainDays","deleteOnVideoDelete"]}
---
