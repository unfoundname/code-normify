---
uid: 21d22b33
id: data.sourcing.t-ac28cee3
parent: data.sourcing
state: planned
tags: ["worker:src-license", "projection:data-contract"]
name: {zh: "LicenseRecord", en: "LicenseRecord"}
description:
  zh: >
      许可记录
  en: >
      License record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/sourcing/t-ac28cee3.json"
apis: []
types:
  - name: "LicenseRecord"
    description: {zh: "许可记录", en: "License record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 content_license；未 verified 的许可不得进入导入主链","properties":{"licenseId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"sourceId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"scope":{"type":"string","enum":["single_asset","catalog_batch","channel"],"description":"范围"},"licenseType":{"type":"string","enum":["exclusive","non_exclusive","window","sublicenseable"],"description":"类型"},"permittedUses":{"type":"array","description":"允许用途","items":{"type":"string","enum":["stream","download","transcode","subtitle","clip","derivative","commercial_use"],"description":"用途"}},"regionAllow":{"type":"array","description":"允许地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"startAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"endAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"attributionRequired":{"type":"boolean","description":"是否要求署名"},"attributionTemplate":{"type":"string","description":"署名模板"},"verificationState":{"type":"string","enum":["pending","verified","rejected","expired"],"description":"核验状态"},"verifiedBy":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["licenseId","sourceId","scope","permittedUses","startAt","endAt","verificationState"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
