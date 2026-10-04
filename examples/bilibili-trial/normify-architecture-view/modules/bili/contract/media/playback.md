---
uid: e1fdf54a
id: bili.contract.media.playback
parent: bili.contract.media
state: planned
tags: ["worker:contract-media"]
name: {zh: "播放授权契约", en: "Playback Grant Contract"}
description:
  zh: >
      所有播放入口统一消费的授权票据：可见性、版权、会员、地域核验通过后才签发签名地址。
      
  en: >
      Unified playback grant issued only after visibility, copyright, membership and geo checks.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/media/playback.ts"
apis: []
types:
  - name: "PlaybackRequest"
    description: {zh: "播放授权请求", en: "Playback request"}
    schema: {"type":"object","additionalProperties":false,"description":"各播放入口（详情页/动态/直播回放/课程）统一构造","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"quality":{"type":"string","description":"期望清晰度"},"subtitleLang":{"type":"string","description":"字幕语言 BCP-47"},"deviceId":{"type":"string","description":"设备标识"},"clientIp":{"type":"string","description":"客户端 IP（用于地域核验）"},"region":{"type":"string","description":"请求地域 ISO 3166-1 alpha-2"},"membershipId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"resumePositionMs":{"type":"integer","description":"续播位置毫秒","minimum":0}},"required":["videoId","deviceId","quality"]}
  - name: "EntitlementCheck"
    description: {zh: "权益核验结果", en: "Entitlement check"}
    schema: {"type":"object","additionalProperties":false,"description":"四项任一失败则拒绝签发","properties":{"visible":{"type":"boolean","description":"可见性核验"},"copyrightOk":{"type":"boolean","description":"版权期限与地域核验"},"membershipOk":{"type":"boolean","description":"会员权益核验"},"geoOk":{"type":"boolean","description":"地域核验"},"decision":{"$ref":"urn:normify:bili.contract.core.authz:AccessDecision"}},"required":["visible","copyrightOk","membershipOk","geoOk"]}
  - name: "PlaybackGrant"
    description: {zh: "播放授权票据", en: "Playback grant"}
    schema: {"type":"object","additionalProperties":false,"description":"票据短时有效，禁止把永久地址写进数据库","properties":{"grantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"renditionId":{"type":"string","description":"档位 id"},"subtitleTracks":{"type":"array","description":"可选字幕轨","items":{"type":"object","additionalProperties":false,"properties":{"lang":{"type":"string","description":"语言"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["lang","assetId"]}},"signedUrls":{"type":"array","description":"签名播放地址","items":{"type":"object","additionalProperties":false,"properties":{"quality":{"type":"string","description":"清晰度"},"protocol":{"type":"string","enum":["hls","dash","mp4"],"description":"分发协议"},"url":{"type":"string","description":"带签名的临时地址"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["quality","protocol","url","expiresAt"]}},"drmPolicy":{"type":"string","enum":["none","clear_key","widevine"],"description":"DRM 策略"},"ipBound":{"type":"boolean","description":"是否绑定来源 IP"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"issuedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"check":{"$ref":"urn:normify:bili.contract.media.playback:EntitlementCheck"}},"required":["grantId","videoId","signedUrls","expiresAt","check"]}
---
