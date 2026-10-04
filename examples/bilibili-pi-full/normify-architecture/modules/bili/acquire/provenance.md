---
uid: "42121699"
id: bili.acquire.provenance
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "溯源与归属", en: "Provenance and attribution"}
description:
  zh: >
      来源链路、原作者归属、许可到内容的可追溯映射
  en: >
      Source chains, original author attribution and license-to-content traceability
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/provenance/src/provenance.ts"
  - path: "services/acquire/provenance/tests/provenance.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/acquire/provenance/"
    description:
      zh: >
          查询溯源记录
      en: >
          Get a provenance record
    output: {module: "bili.acquire.provenance", name: "ProvenanceRecord"}
types:
  - name: "ProvenanceRecord"
    description: {zh: "溯源记录", en: "Provenance record"}
    schema: {"type":"object","description":"溯源记录 / Provenance record","additionalProperties":false,"properties":{"provenanceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 provenanceId（语义见对应领域契约） / Field provenanceId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"evidenceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"许可证据 ID / License evidence id"},"originalAuthor":{"type":"string","minLength":1,"description":"字段 originalAuthor（语义见对应领域契约） / Field originalAuthor"},"attribution":{"type":"string","minLength":1,"description":"归属声明 / Attribution statement"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"许可类型 / License type"}},"required":["provenanceId","assetId","sourceId","evidenceId","originalAuthor","attribution","licenseType"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "溯源字段遵循统一 ID 与时间规则", en: "Provenance fields follow"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
---
