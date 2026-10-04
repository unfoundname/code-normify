---
uid: 9b5da1a9
id: bili.pgc.license
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "版权地域与期限", en: "Territorial licenses and terms"}
description:
  zh: >
      版权窗口、地域限制、窗口期切换与到期下线
  en: >
      License windows, territorial restrictions, window switching and expiry takedown
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/license/src/license.ts"
  - path: "services/pgc/license/tests/license.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/pgc/licenses/by-resource/:resourceId"
    description:
      zh: >
          按资源查询版权窗口（播放授权核对地域与期限时调用）
      en: >
          Query the license window of a resource (used by playback grant)
    input: {module: "bili.pgc.license", name: "LicenseQueryRequest"}
    output: {module: "bili.pgc.license", name: "LicenseWindow"}
  - protocol: http
    method: POST
    path: "/api/v1/pgc/licenses"
    description:
      zh: >
          登记版权窗口
      en: >
          Register a license window
    input: {module: "bili.pgc.license", name: "LicenseRequest"}
    output: {module: "bili.pgc.license", name: "LicenseWindow"}
types:
  - name: "LicenseWindow"
    description: {zh: "版权窗口", en: "License window"}
    schema: {"type":"object","description":"版权窗口 / License window","additionalProperties":false,"properties":{"licenseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"许可 ID / License id"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"territoryCodes":{"type":"array","items":{"type":"string","minLength":1},"description":"授权地域列表 / Licensed territories"},"validFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"生效时间 / Valid from"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"exclusive":{"type":"boolean","description":"字段 exclusive（语义见对应领域契约） / Field exclusive"},"holder":{"type":"string","minLength":1,"description":"字段 holder（语义见对应领域契约） / Field holder"}},"required":["licenseId","resourceId","territoryCodes","validFrom","validTo","exclusive","holder"]}
  - name: "LicenseRequest"
    description: {zh: "版权窗口写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "License window write request carrying only client-provided fields"}
    schema: {"type":"object","description":"版权窗口写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / License window write request carrying only client-provided fields","additionalProperties":false,"properties":{"licenseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"许可 ID / License id"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"territoryCodes":{"type":"array","items":{"type":"string","minLength":1},"description":"授权地域列表 / Licensed territories"},"validFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"生效时间 / Valid from"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"exclusive":{"type":"boolean","description":"字段 exclusive（语义见对应领域契约） / Field exclusive"},"holder":{"type":"string","minLength":1,"description":"字段 holder（语义见对应领域契约） / Field holder"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["licenseId","resourceId","territoryCodes","validFrom","validTo","exclusive","holder","idempotencyKey","requestContext"]}
  - name: "LicenseQueryRequest"
    description: {zh: "版权窗口查询请求", en: "License query request"}
    schema: {"type":"object","description":"版权窗口查询请求 / License query request","additionalProperties":false,"properties":{"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"}},"required":["resourceId"]}
deps:
  - kind: call
    to: bili.acquire.license
    label: {zh: "引用许可证据", en: "Reference license evidence"}
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
