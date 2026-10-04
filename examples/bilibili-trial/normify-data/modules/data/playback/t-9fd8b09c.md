---
uid: d3c00262
id: data.playback.t-9fd8b09c
parent: data.playback
state: planned
tags: ["worker:play-grant", "projection:data-contract"]
name: {zh: "GrantAuditRecord", en: "GrantAuditRecord"}
description:
  zh: >
      授权审计记录
  en: >
      Grant audit record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/playback/t-9fd8b09c.json"
apis: []
types:
  - name: "GrantAuditRecord"
    description: {zh: "授权审计记录", en: "Grant audit record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 playback_grant_audit，仅追加；票据本身不落明文 URL","properties":{"grantId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"deviceId":{"type":"string","description":"设备标识"},"clientIp":{"type":"string","description":"来源 IP"},"decision":{"type":"string","enum":["issued","denied"],"description":"结论"},"denyReason":{"$ref":"urn:normify:data.contract.t-0b2c71e9:AccessDecision"},"issuedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["grantId","userId","videoId","decision","issuedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-0b2c71e9
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
