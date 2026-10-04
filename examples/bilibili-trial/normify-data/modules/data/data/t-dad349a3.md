---
uid: 0d1af3a1
id: data.data.t-dad349a3
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "ObjectKeyContract", en: "ObjectKeyContract"}
description:
  zh: >
      对象键契约
  en: >
      Object key contract
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-dad349a3.json"
apis: []
types:
  - name: "ObjectKeyContract"
    description: {zh: "对象键契约", en: "Object key contract"}
    schema: {"type":"object","additionalProperties":false,"description":"bucket 名称与地域待用户配置","properties":{"purpose":{"type":"string","enum":["media-origin","media-transcoded","cover","subtitle","preview","live-record","live-cover","attachment","export","import-stage"],"description":"用途"},"keyPattern":{"type":"string","description":"键规则，如 origin/{ownerId}/{videoId}/{assetId}"},"contentTypes":{"type":"array","description":"允许 MIME","items":{"type":"string","description":"MIME"}},"maxSizeBytes":{"type":"integer","description":"单对象上限","minimum":1},"lifecycle":{"type":"string","enum":["hot","ia_30d","archive_180d","delete_after_90d"],"description":"生命周期"},"encryption":{"type":"string","enum":["none","sse_oss","sse_kms"],"description":"加密"}},"required":["purpose","keyPattern","lifecycle","encryption"]}
---
