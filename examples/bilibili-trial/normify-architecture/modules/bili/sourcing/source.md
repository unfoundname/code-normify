---
uid: b670b4ec
id: bili.sourcing.source
parent: bili.sourcing
state: planned
tags: ["worker:src-source"]
name: {zh: "许可来源登记与发现", en: "Source Registry and Discovery"}
description:
  zh: >
      来源登记（创作者投稿、明确许可的内容源、公共领域）、发现记录与 robots/条款摘要、来源准入与暂停。
      
  en: >
      Source registry (creator submissions, licensed providers, public domain), discovery records, admission and suspension.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/source/src/registry.ts"
  - path: "services/sourcing/source/src/discovery.ts"
  - path: "services/sourcing/source/migrations/0001_source.sql"
  - path: "services/sourcing/source/tests/source.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/sources"
    description:
      zh: >
          登记内容来源
          
      en: >
          Register source
          
    input: {module: "bili.sourcing.source", name: "ContentSource"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/sources"
    description:
      zh: >
          列出内容来源
          
      en: >
          List sources
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.sourcing.source", name: "ContentSource"}
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/sources/{id}/discoveries"
    description:
      zh: >
          登记发现记录
          
      en: >
          Record discovery
          
    input: {module: "bili.sourcing.source", name: "SourceDiscoveryRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "content_source"
    description:
      zh: >
          内容来源表（唯一写入所有者：来源服务）
          
      en: >
          content_source table
          
types:
  - name: "ContentSource"
    description: {zh: "内容来源", en: "Content source"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 content_source；来源必须显式登记许可模式，未登记不得抓取","properties":{"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"来源名称","maxLength":120},"sourceType":{"type":"string","enum":["creator_submission","licensed_provider","public_domain","open_license","partner_feed","manual_upload"],"description":"来源类型"},"baseUrl":{"type":"string","description":"来源站点/接口地址"},"licenseModel":{"type":"string","enum":["per_asset","blanket_agreement","cc_by","cc_by_sa","public_domain","written_permission","pending_decision"],"description":"许可模式"},"allowedImportMethods":{"type":"array","description":"允许获取方式","items":{"type":"string","enum":["api","rss","sitemap","manual_download","partner_delivery","user_upload"],"description":"方式"}},"region":{"type":"string","description":"地域"},"contactRef":{"type":"string","description":"联系人/联系方式引用"},"state":{"type":"string","enum":["candidate","approved","suspended","rejected"],"description":"状态机"},"notes":{"type":"string","description":"说明"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["sourceId","name","sourceType","licenseModel","state"]}
  - name: "SourceDiscoveryRecord"
    description: {zh: "来源发现记录", en: "Source discovery record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 source_discovery_record；robots 不允许或条款不明一律不得进入下载队列","properties":{"discoveryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"discoveredUrl":{"type":"string","description":"发现的资源地址"},"method":{"type":"string","enum":["api","rss","sitemap","crawl","manual"],"description":"发现方式"},"termsSummary":{"type":"string","description":"条款摘要"},"robotsAllowed":{"type":"boolean","description":"robots/条款是否允许"},"reviewState":{"type":"string","enum":["pending","approved","rejected"],"description":"复核状态"},"discoveredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"reviewedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["discoveryId","sourceId","discoveredUrl","method","reviewState","discoveredAt"]}
deps:
  - kind: call
    to: bili.ops.rights
    from_api: "POST /api/v1/sourcing/sources"
    to_api: "POST /api/v1/ops/licenses/{id}/evidence-check"
    label: {zh: "来源准入复用版权核验", en: "Admission reuses rights review"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "来源与发现审计", en: "Audit sources and discoveries"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "来源状态事件", en: "Source state events"}
---
