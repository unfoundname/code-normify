---
uid: 11c4a0ef
id: bili.acquire.license
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "许可证据", en: "License evidence"}
description:
  zh: >
      许可截图/合同编号/条款摘要的登记、核验与到期提醒
  en: >
      Registration, verification and expiry reminders for license evidence
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/license/src/license-evidence.ts"
  - path: "services/acquire/license/tests/license-evidence.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/acquire/license-evidence"
    description:
      zh: >
          登记许可证据
      en: >
          Register license evidence
    input: {module: "bili.acquire.license", name: "LicenseEvidenceSubmitRequest"}
    output: {module: "bili.acquire.license", name: "LicenseEvidence"}
  - protocol: http
    method: POST
    path: "/api/v1/acquire/license-evidence/verify"
    description:
      zh: >
          核验许可证据
      en: >
          Verify license evidence
    input: {module: "bili.acquire.license", name: "LicenseVerifyRequest"}
    output: {module: "bili.acquire.license", name: "LicenseEvidence"}
types:
  - name: "LicenseEvidence"
    description: {zh: "许可证据", en: "License evidence"}
    schema: {"type":"object","description":"许可证据 / License evidence","additionalProperties":false,"properties":{"evidenceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"许可证据 ID / License evidence id"},"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"许可类型 / License type"},"evidenceUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 evidenceUrl（语义见对应领域契约） / Field evidenceUrl"},"licenseVerified":{"type":"boolean","description":"许可是否已核验 / Whether license is verified"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"reviewerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reviewerId（语义见对应领域契约） / Field reviewerId"}},"required":["evidenceId","sourceId","licenseType","evidenceUrl","licenseVerified"]}
  - name: "LicenseVerifyRequest"
    description: {zh: "许可证据核验请求", en: "License evidence verification request"}
    schema: {"type":"object","description":"许可证据核验请求 / License evidence verification request","additionalProperties":false,"properties":{"evidenceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"许可证据 ID / License evidence id"},"decision":{"type":"string","enum":["VERIFIED","REJECTED"],"description":"字段 decision（语义见对应领域契约） / Field decision"},"note":{"type":"string","minLength":1,"description":"字段 note（语义见对应领域契约） / Field note"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["evidenceId","decision","idempotencyKey","requestContext"]}
  - name: "LicenseEvidenceSubmitRequest"
    description: {zh: "许可证据登记请求", en: "License evidence submission"}
    schema: {"type":"object","description":"许可证据登记请求 / License evidence submission","additionalProperties":false,"properties":{"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"许可类型 / License type"},"evidenceUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 evidenceUrl（语义见对应领域契约） / Field evidenceUrl"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"attributionDraft":{"type":"string","minLength":1,"description":"字段 attributionDraft（语义见对应领域契约） / Field attributionDraft"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sourceId","licenseType","evidenceUrl","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.infra.config
    label: {zh: "证据存储地址与凭据引用", en: "Evidence storage references"}
  - kind: call
    to: bili.identity.rbac
    label: {zh: "核验角色的权限校验", en: "Reviewer role authorization"}
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
