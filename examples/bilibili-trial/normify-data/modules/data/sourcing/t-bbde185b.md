---
uid: 944c6918
id: data.sourcing.t-bbde185b
parent: data.sourcing
state: planned
tags: ["worker:src-attr", "projection:data-contract"]
name: {zh: "AttributionRecord", en: "AttributionRecord"}
description:
  zh: >
      归属信息
  en: >
      Attribution record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/sourcing/t-bbde185b.json"
apis: []
types:
  - name: "AttributionRecord"
    description: {zh: "归属信息", en: "Attribution record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 attribution_record；导入后不可删除，只能追加修订","properties":{"attributionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"sourceId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"licenseId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"creatorName":{"type":"string","description":"原始作者"},"creatorProfileUrl":{"type":"string","description":"作者主页"},"originalTitle":{"type":"string","description":"原始标题"},"originalUrl":{"type":"string","description":"原始链接"},"licenseName":{"type":"string","description":"许可名称，如 CC BY-SA 4.0"},"licenseUrl":{"type":"string","description":"许可条款链接"},"attributionText":{"type":"string","description":"展示署名文案"},"requiredOnScreen":{"type":"boolean","description":"是否要求在画面/简介展示"},"requiredInDescription":{"type":"boolean","description":"是否要求在简介展示"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["attributionId","assetId","sourceId","licenseId","creatorName","attributionText"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
