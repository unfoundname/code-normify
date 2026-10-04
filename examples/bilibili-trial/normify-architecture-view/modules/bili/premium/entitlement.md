---
uid: 102e5cad
id: bili.premium.entitlement
parent: bili.premium
state: planned
tags: ["worker:pm-entitle"]
name: {zh: "版权许可与观看权益", en: "Copyright License and Entitlement"}
description:
  zh: >
      版权许可证据与地域/期限窗口、DRM 要求、单集付费与试看、地域限制判定；播放入口唯一调用。
      
  en: >
      License evidence with geo/window, DRM requirements, paid episodes and previews, geo restriction checks.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/premium/entitlement/src/license.ts"
  - path: "services/premium/entitlement/src/check.ts"
  - path: "services/premium/entitlement/migrations/0001_license.sql"
  - path: "services/premium/entitlement/tests/entitlement.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/entitlements/{targetType}/{targetId}"
    description:
      zh: >
          查询观看权益
          
      en: >
          Get entitlement
          
    output: {module: "bili.premium.entitlement", name: "PlaybackEntitlement"}
  - protocol: http
    method: GET
    path: "/api/v1/seasons/{id}/license"
    description:
      zh: >
          读取版权窗口与地域（运营可见）
          
      en: >
          Get license window
          
    output: {module: "bili.premium.entitlement", name: "CopyrightLicense"}
  - protocol: mysql
    path: "copyright_license"
    description:
      zh: >
          版权许可表（唯一写入所有者：权益服务）
          
      en: >
          copyright_license table
          
types:
  - name: "CopyrightLicense"
    description: {zh: "版权许可", en: "Copyright license"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 copyright_license；许可证据原件存 OSS，RDS 只存引用与条款","properties":{"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["season","episode","video","course"],"description":"对象"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licensor":{"type":"string","description":"授权方名称"},"licenseType":{"type":"string","enum":["exclusive","non_exclusive","window","sub_license"],"description":"类型"},"regionAllow":{"type":"array","description":"允许地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"regionDeny":{"type":"array","description":"禁止地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"drmRequired":{"type":"boolean","description":"是否要求 DRM"},"evidenceRef":{"type":"string","description":"许可证据文件引用（OSS 对象键）"},"state":{"type":"string","enum":["draft","active","expiring","expired","terminated"],"description":"状态"}},"required":["licenseId","targetType","targetId","licenseType","startAt","endAt","state"]}
  - name: "PlaybackEntitlement"
    description: {zh: "观看权益", en: "Playback entitlement"}
    schema: {"type":"object","additionalProperties":false,"description":"即时判定结果，可缓存短时；不写回业务表","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","enum":["vip_free","vip_only","paid_episode","preview_only","region_blocked","free"],"description":"权益类型"},"validFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"validTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"sourceOrderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"resolvedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","targetType","targetId","kind","validFrom"]}
  - name: "GeoRestrictionRule"
    description: {zh: "地域限制规则", en: "Geo restriction rule"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 geo_restriction_rule","properties":{"ruleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"allowRegions":{"type":"array","description":"允许地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"denyRegions":{"type":"array","description":"禁止地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"fallbackAction":{"type":"string","enum":["block","preview_only","redirect_region"],"description":"降级动作"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ruleId","targetId","fallbackAction"]}
deps:
  - kind: reference
    to: bili.contract.media.playback
    from_api: "GET /api/v1/entitlements/{targetType}/{targetId}"
    label: {zh: "播放授权核验本模块结论", en: "Grant verifies entitlement"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "DRM 能力待接入", en: "DRM pending"}
  - kind: call
    to: bili.commerce.membership
    label: {zh: "会员权益判定", en: "Membership check"}
  - kind: call
    to: bili.commerce.order
    label: {zh: "单集付费订单校验", en: "Paid episode order check"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "版权到期事件触发下架建议", en: "License expiry events"}
---
