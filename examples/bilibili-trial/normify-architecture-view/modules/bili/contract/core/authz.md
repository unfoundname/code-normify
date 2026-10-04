---
uid: e63ba6b4
id: bili.contract.core.authz
parent: bili.contract.core
state: planned
tags: ["worker:contract-core"]
name: {zh: "鉴权上下文契约", en: "Authorization Context"}
description:
  zh: >
      统一鉴权上下文、权限码与访问判定原因，播放入口与运营后台共用。
      
  en: >
      Authorization context, permission codes and access decision reasons.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/authz.ts"
  - path: "packages/contracts/tests/authz.test.ts"
apis: []
types:
  - name: "AuthContext"
    description: {zh: "鉴权上下文", en: "Authorization context"}
    schema: {"type":"object","additionalProperties":false,"description":"由接入层解析令牌后注入，业务模块只读","properties":{"actorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roles":{"type":"array","description":"角色码","items":{"type":"string","description":"角色码"}},"permissions":{"type":"array","description":"权限码","items":{"$ref":"urn:normify:bili.contract.core.authz:PermissionCode"}},"deviceId":{"type":"string","description":"设备标识"},"tokenId":{"type":"string","description":"令牌标识"},"channel":{"type":"string","enum":["web","admin","studio","openapi"],"description":"访问通道"}},"required":["actorId","roles"]}
  - name: "PermissionCode"
    description: {zh: "权限码", en: "Permission code"}
    schema: {"type":"string","description":"域:资源:动作 三段式","pattern":"^[a-z]+:[a-z_]+:[a-z_]+$"}
  - name: "AccessDecision"
    description: {zh: "访问判定", en: "Access decision"}
    schema: {"type":"object","additionalProperties":false,"properties":{"allowed":{"type":"boolean","description":"是否允许"},"reason":{"type":"string","enum":["granted","not_authenticated","missing_permission","blocked_by_privacy","blocked_by_blacklist","copyright_restricted","membership_required","geo_restricted"],"description":"判定原因"}},"required":["allowed","reason"]}
---
