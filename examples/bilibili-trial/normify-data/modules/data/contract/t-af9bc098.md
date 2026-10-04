---
uid: 9e30da33
id: data.contract.t-af9bc098
parent: data.contract
state: planned
tags: ["worker:contract-media", "projection:data-contract"]
name: {zh: "PlaybackGrant", en: "PlaybackGrant"}
description:
  zh: >
      播放授权票据
  en: >
      Playback grant
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-af9bc098.json"
apis: []
types:
  - name: "PlaybackGrant"
    description: {zh: "播放授权票据", en: "Playback grant"}
    schema: {"type":"object","additionalProperties":false,"description":"票据短时有效，禁止把永久地址写进数据库","properties":{"grantId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"episodeId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"renditionId":{"type":"string","description":"档位 id"},"subtitleTracks":{"type":"array","description":"可选字幕轨","items":{"type":"object","additionalProperties":false,"properties":{"lang":{"type":"string","description":"语言"},"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"required":["lang","assetId"]}},"signedUrls":{"type":"array","description":"签名播放地址","items":{"type":"object","additionalProperties":false,"properties":{"quality":{"type":"string","description":"清晰度"},"protocol":{"type":"string","enum":["hls","dash","mp4"],"description":"分发协议"},"url":{"type":"string","description":"带签名的临时地址"},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["quality","protocol","url","expiresAt"]}},"drmPolicy":{"type":"string","enum":["none","clear_key","widevine"],"description":"DRM 策略"},"ipBound":{"type":"boolean","description":"是否绑定来源 IP"},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"issuedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"check":{"$ref":"urn:normify:data.contract.t-840e83ac:EntitlementCheck"}},"required":["grantId","videoId","signedUrls","expiresAt","check"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-840e83ac
    label: {zh: "类型引用", en: "Type reference"}
---
