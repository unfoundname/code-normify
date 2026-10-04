---
uid: 4626afc9
id: data.live.t-88cb5e2a
parent: data.live
state: planned
tags: ["worker:live-link", "projection:data-contract"]
name: {zh: "RtcJoinTicket", en: "RtcJoinTicket"}
description:
  zh: >
      RTC 入会票据
  en: >
      RTC join ticket
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-88cb5e2a.json"
apis: []
types:
  - name: "RtcJoinTicket"
    description: {zh: "RTC 入会票据", en: "RTC join ticket"}
    schema: {"type":"object","additionalProperties":false,"description":"令牌短时有效，供应商待接入","properties":{"sessionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"participantId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"rtcRoomId":{"type":"string","description":"RTC 房间号"},"token":{"type":"string","description":"入会令牌（短时）"},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"role":{"type":"string","enum":["host","guest","audience"],"description":"角色"}},"required":["sessionId","participantId","rtcRoomId","token","expiresAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
