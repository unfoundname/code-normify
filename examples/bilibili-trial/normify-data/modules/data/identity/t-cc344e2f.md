---
uid: 38626bb2
id: data.identity.t-cc344e2f
parent: data.identity
state: planned
tags: ["worker:id-security", "projection:data-contract"]
name: {zh: "DeviceSession", en: "DeviceSession"}
description:
  zh: >
      设备会话
  en: >
      Device session
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/identity/t-cc344e2f.json"
apis: []
types:
  - name: "DeviceSession"
    description: {zh: "设备会话", en: "Device session"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 device_session，索引 user_id+last_seen_at","properties":{"sessionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"deviceId":{"type":"string","description":"设备标识"},"deviceName":{"type":"string","description":"设备名"},"clientIp":{"type":"string","description":"来源 IP"},"userAgent":{"type":"string","description":"UA"},"issuedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"lastSeenAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"revokedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"riskLevel":{"type":"string","enum":["low","medium","high"],"description":"风险级别"}},"required":["sessionId","userId","deviceId","riskLevel"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
