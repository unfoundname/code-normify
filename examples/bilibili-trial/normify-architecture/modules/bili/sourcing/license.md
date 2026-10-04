---
uid: 700921b8
id: bili.sourcing.license
parent: bili.sourcing
state: planned
tags: ["worker:src-license"]
name: {zh: "许可证据与范围", en: "Licenses and Evidence"}
description:
  zh: >
      许可条款（用途、地域、期限、署名要求）、证据文件与摘要留档、核验状态与到期提醒。
      
  en: >
      License terms (uses, region, window, attribution), evidence files with digests, verification state and expiry.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/license/src/registry.ts"
  - path: "services/sourcing/license/src/evidence.ts"
  - path: "services/sourcing/license/migrations/0001_license.sql"
  - path: "services/sourcing/license/tests/license.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/licenses"
    description:
      zh: >
          登记许可条款
          
      en: >
          Register license
          
    input: {module: "bili.sourcing.license", name: "LicenseRecord"}
    output: {module: "bili.sourcing.license", name: "LicenseRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/licenses/{id}/evidence"
    description:
      zh: >
          上传许可证据
          
      en: >
          Attach evidence
          
    input: {module: "bili.sourcing.license", name: "LicenseEvidence"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/licenses/{id}"
    description:
      zh: >
          读取许可与证据
          
      en: >
          Get license
          
    output: {module: "bili.sourcing.license", name: "LicenseRecord"}
  - protocol: mysql
    path: "content_license"
    description:
      zh: >
          许可记录表（唯一写入所有者：许可服务）
          
      en: >
          content_license table
          
types:
  - name: "LicenseRecord"
    description: {zh: "许可记录", en: "License record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 content_license；未 verified 的许可不得进入导入主链","properties":{"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"scope":{"type":"string","enum":["single_asset","catalog_batch","channel"],"description":"范围"},"licenseType":{"type":"string","enum":["exclusive","non_exclusive","window","sublicenseable"],"description":"类型"},"permittedUses":{"type":"array","description":"允许用途","items":{"type":"string","enum":["stream","download","transcode","subtitle","clip","derivative","commercial_use"],"description":"用途"}},"regionAllow":{"type":"array","description":"允许地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"attributionRequired":{"type":"boolean","description":"是否要求署名"},"attributionTemplate":{"type":"string","description":"署名模板"},"verificationState":{"type":"string","enum":["pending","verified","rejected","expired"],"description":"核验状态"},"verifiedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["licenseId","sourceId","scope","permittedUses","startAt","endAt","verificationState"]}
  - name: "LicenseEvidence"
    description: {zh: "许可证据", en: "License evidence"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 license_evidence；证据原件存 OSS，RDS 只存引用与摘要","properties":{"evidenceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"evidenceType":{"type":"string","enum":["contract","email","invoice","terms_page","screenshot","api_response"],"description":"证据类型"},"ossKey":{"type":"string","description":"证据对象键（OSS）"},"digestSha256":{"type":"string","description":"SHA-256","pattern":"^[a-f0-9]{64}$"},"capturedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"capturedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"note":{"type":"string","description":"说明"}},"required":["evidenceId","licenseId","evidenceType","ossKey","digestSha256","capturedAt"]}
deps:
  - kind: call
    to: bili.contract.adapters.oss
    from_api: "POST /api/v1/sourcing/licenses/{id}/evidence"
    label: {zh: "证据文件写入对象存储", en: "Store evidence objects"}
  - kind: reference
    to: bili.data.oss
    label: {zh: "对象键与生命周期契约", en: "Object key contract"}
  - kind: call
    to: bili.premium.entitlement
    label: {zh: "许可条款下发为播放权益窗口", en: "License feeds entitlement wind"}
  - kind: call
    to: bili.ops.rights
    label: {zh: "与运营版权核验记录对齐", en: "Align with rights checks"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "到期提醒任务", en: "Expiry reminder jobs"}
---
