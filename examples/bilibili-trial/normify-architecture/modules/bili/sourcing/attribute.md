---
uid: 3ecdec2b
id: bili.sourcing.attribute
parent: bili.sourcing
state: planned
tags: ["worker:src-attr"]
name: {zh: "溯源与归属", en: "Provenance and Attribution"}
description:
  zh: >
      原始作者、原始地址、许可名称与署名文案、展示位置要求、完整溯源链与完整性摘要。
      
  en: >
      Original author, url, license name, attribution text and placement, full provenance chain with integrity digest.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/attribute/src/attribution.ts"
  - path: "services/sourcing/attribute/src/provenance.ts"
  - path: "services/sourcing/attribute/migrations/0001_attribution.sql"
  - path: "services/sourcing/attribute/tests/attribution.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/attributions"
    description:
      zh: >
          登记归属信息
          
      en: >
          Register attribution
          
    input: {module: "bili.sourcing.attribute", name: "AttributionRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/assets/{assetId}/provenance"
    description:
      zh: >
          读取资产的溯源链
          
      en: >
          Get provenance
          
    output: {module: "bili.sourcing.attribute", name: "ProvenanceChain"}
  - protocol: mysql
    path: "provenance_chain"
    description:
      zh: >
          溯源链表（唯一写入所有者：溯源服务）
          
      en: >
          provenance_chain table
          
types:
  - name: "AttributionRecord"
    description: {zh: "归属信息", en: "Attribution record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 attribution_record；导入后不可删除，只能追加修订","properties":{"attributionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"creatorName":{"type":"string","description":"原始作者"},"creatorProfileUrl":{"type":"string","description":"作者主页"},"originalTitle":{"type":"string","description":"原始标题"},"originalUrl":{"type":"string","description":"原始链接"},"licenseName":{"type":"string","description":"许可名称，如 CC BY-SA 4.0"},"licenseUrl":{"type":"string","description":"许可条款链接"},"attributionText":{"type":"string","description":"展示署名文案"},"requiredOnScreen":{"type":"boolean","description":"是否要求在画面/简介展示"},"requiredInDescription":{"type":"boolean","description":"是否要求在简介展示"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["attributionId","assetId","sourceId","licenseId","creatorName","attributionText"]}
  - name: "ProvenanceChain"
    description: {zh: "溯源链", en: "Provenance chain"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 provenance_chain；出现版权争议时作为证据","properties":{"chainId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"steps":{"type":"array","description":"链路步骤","items":{"type":"object","additionalProperties":false,"properties":{"stepIndex":{"type":"integer","description":"序号","minimum":0},"stage":{"type":"string","enum":["discovered","licensed","fetched","deduped","attributed","ingested","published"],"description":"阶段"},"actor":{"type":"string","description":"执行者（人或服务）"},"detail":{"type":"string","description":"细节"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["stepIndex","stage","occurredAt"]}},"integrityDigest":{"type":"string","description":"链路摘要（防篡改）"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["chainId","assetId","steps","integrityDigest"]}
deps:
  - kind: call
    to: bili.sourcing.license
    label: {zh: "归属信息来自许可条款", en: "Attribution from license terms"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "发布时把署名注入详情", en: "Inject attribution on publish"}
  - kind: call
    to: bili.ops.rights
    label: {zh: "版权争议时提供证据", en: "Evidence for disputes"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "溯源链完整性告警", en: "Alert on chain tampering"}
---
