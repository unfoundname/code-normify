---
uid: b1baa714
id: bili.identity.privacy
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "隐私与黑名单", en: "Privacy and blocklist"}
description:
  zh: >
      隐私开关、数据导出与注销、黑名单与关注可见性
  en: >
      Privacy switches, data export and deletion, blocklist and follow visibility
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/privacy/src/privacy.ts"
  - path: "services/identity/privacy/tests/privacy.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/identity/privacy/"
    description:
      zh: >
          更新隐私设置
      en: >
          Update privacy settings
    input: {module: "bili.identity.privacy", name: "PrivacySettingRequest"}
    output: {module: "bili.identity.privacy", name: "PrivacySetting"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/blocks"
    description:
      zh: >
          加入或移出黑名单
      en: >
          Add or remove a block
    input: {module: "bili.identity.privacy", name: "BlockToggleRequest"}
types:
  - name: "PrivacySetting"
    description: {zh: "隐私设置", en: "Privacy settings"}
    schema: {"type":"object","description":"隐私设置 / Privacy settings","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"hideFollowing":{"type":"boolean","description":"字段 hideFollowing（语义见对应领域契约） / Field hideFollowing"},"hideFavorites":{"type":"boolean","description":"字段 hideFavorites（语义见对应领域契约） / Field hideFavorites"},"allowDmFrom":{"type":"string","enum":["ALL","FOLLOWERS","NONE"],"description":"字段 allowDmFrom（语义见对应领域契约） / Field allowDmFrom"},"searchable":{"type":"boolean","description":"字段 searchable（语义见对应领域契约） / Field searchable"}},"required":["userId","hideFollowing","hideFavorites","allowDmFrom","searchable"]}
  - name: "BlockRelation"
    description: {zh: "黑名单关系", en: "Block relation"}
    schema: {"type":"object","description":"黑名单关系 / Block relation","additionalProperties":false,"properties":{"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"blockedId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 blockedId（语义见对应领域契约） / Field blockedId"},"blockedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 blockedAt（语义见对应领域契约） / Field blockedAt"}},"required":["ownerId","blockedId","blockedAt"]}
  - name: "BlockToggleRequest"
    description: {zh: "黑名单开关请求", en: "Block toggle request"}
    schema: {"type":"object","description":"黑名单开关请求 / Block toggle request","additionalProperties":false,"properties":{"targetUserId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 targetUserId（语义见对应领域契约） / Field targetUserId"},"blocked":{"type":"boolean","description":"字段 blocked（语义见对应领域契约） / Field blocked"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["targetUserId","blocked","idempotencyKey","requestContext"]}
  - name: "PrivacySettingRequest"
    description: {zh: "隐私设置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Privacy settings write request carrying only client-provided fields"}
    schema: {"type":"object","description":"隐私设置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Privacy settings write request carrying only client-provided fields","additionalProperties":false,"properties":{"hideFollowing":{"type":"boolean","description":"字段 hideFollowing（语义见对应领域契约） / Field hideFollowing"},"hideFavorites":{"type":"boolean","description":"字段 hideFavorites（语义见对应领域契约） / Field hideFavorites"},"allowDmFrom":{"type":"string","enum":["ALL","FOLLOWERS","NONE"],"description":"字段 allowDmFrom（语义见对应领域契约） / Field allowDmFrom"},"searchable":{"type":"boolean","description":"字段 searchable（语义见对应领域契约） / Field searchable"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["hideFollowing","hideFavorites","allowDmFrom","searchable","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
