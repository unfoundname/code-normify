---
uid: 663241ca
id: bili.playback.grant
parent: bili.playback
state: planned
tags: ["worker:play-grant"]
name: {zh: "播放授权签发", en: "Playback Grant Issuance"}
description:
  zh: >
      所有播放入口的唯一签发点：核验可见性、隐私/黑名单、版权地域与会员权益后才签发短时签名地址。
      
  en: >
      Sole issuance point verifying visibility, privacy/blacklist, copyright geo and membership before signing urls.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/grant/src/issue.ts"
  - path: "services/playback/grant/src/verify.ts"
  - path: "services/playback/grant/migrations/0001_grant.sql"
  - path: "services/playback/grant/tests/grant.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/playback/grants"
    description:
      zh: >
          签发播放授权票据
          
      en: >
          Issue playback grant
          
    input: {module: "bili.contract.media.playback", name: "PlaybackRequest"}
    output: {module: "bili.contract.media.playback", name: "PlaybackGrant"}
  - protocol: http
    method: GET
    path: "/api/v1/playback/grants/{id}"
    description:
      zh: >
          校验票据有效性
          
      en: >
          Verify grant
          
    output: {module: "bili.playback.grant", name: "GrantValidation"}
  - protocol: http
    method: POST
    path: "/api/v1/playback/grants/{id}/heartbeat"
    description:
      zh: >
          票据续期（重核权益）
          
      en: >
          Renew grant
          
    input: {module: "bili.playback.grant", name: "GrantHeartbeat"}
    output: {module: "bili.contract.media.playback", name: "PlaybackGrant"}
  - protocol: mysql
    path: "playback_grant_audit"
    description:
      zh: >
          授权审计表（唯一写入所有者：播放授权服务）
          
      en: >
          playback_grant_audit table
          
types:
  - name: "EntitlementResolution"
    description: {zh: "权益核验结论", en: "Entitlement resolution"}
    schema: {"type":"object","additionalProperties":false,"description":"结论只读，不写回业务表","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"privacyBlocked":{"type":"boolean","description":"是否被隐私或黑名单拦截"},"regionRestricted":{"type":"array","description":"受限地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"copyrightWindow":{"type":"object","additionalProperties":false,"properties":{"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"licensed":{"type":"boolean","description":"是否在授权期限内"}},"required":["licensed"]},"membershipRequired":{"type":"boolean","description":"是否需要会员"},"membershipOk":{"type":"boolean","description":"会员权益是否满足"},"decision":{"$ref":"urn:normify:bili.contract.core.authz:AccessDecision"}},"required":["videoId","visibility","membershipRequired","decision"]}
  - name: "GrantValidation"
    description: {zh: "票据校验结果", en: "Grant validation"}
    schema: {"type":"object","additionalProperties":false,"description":"供网关/CDN 校验，不返回新的签名地址","properties":{"grantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"valid":{"type":"boolean","description":"是否有效"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"ipBound":{"type":"boolean","description":"是否绑定来源 IP"},"decision":{"$ref":"urn:normify:bili.contract.core.authz:AccessDecision"}},"required":["grantId","valid","expiresAt"]}
  - name: "GrantAuditRecord"
    description: {zh: "授权审计记录", en: "Grant audit record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 playback_grant_audit，仅追加；票据本身不落明文 URL","properties":{"grantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"deviceId":{"type":"string","description":"设备标识"},"clientIp":{"type":"string","description":"来源 IP"},"decision":{"type":"string","enum":["issued","denied"],"description":"结论"},"denyReason":{"$ref":"urn:normify:bili.contract.core.authz:AccessDecision"},"issuedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["grantId","userId","videoId","decision","issuedAt"]}
  - name: "GrantHeartbeat"
    description: {zh: "票据续期请求", en: "Grant heartbeat"}
    schema: {"type":"object","additionalProperties":false,"description":"续期时重新核验权益，不允许跨设备复用","properties":{"grantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"positionMs":{"type":"integer","description":"当前播放位置毫秒","minimum":0},"networkKbps":{"type":"integer","description":"估算带宽","minimum":0}},"required":["grantId","positionMs"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/playback/grants"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "读取发布状态与可见性", en: "Read publish state and visibil"}
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/playback/grants"
    to_api: "GET /api/v1/users/{userId}"
    label: {zh: "核验隐私与黑名单", en: "Check privacy and blacklist"}
  - kind: call
    to: bili.identity.verify
    label: {zh: "未成年人时段与时长限制", en: "Minor curfew and limits"}
  - kind: reference
    to: bili.contract.media.playback
    label: {zh: "票据契约与核验枚举", en: "Grant contract"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "授权拒绝原因审计", en: "Audit denials"}
  - kind: call
    to: bili.commerce.membership
    from_api: "POST /api/v1/playback/grants"
    to_api: "POST /internal/membership/entitlements/check"
    label: {zh: "会员权益核验", en: "Membership check"}
  - kind: call
    to: bili.premium.entitlement
    from_api: "POST /api/v1/playback/grants"
    to_api: "GET /api/v1/entitlements/{targetType}/{targetId}"
    label: {zh: "版权窗口与地域核验", en: "License window check"}
---
