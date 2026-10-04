---
uid: cd474b99
id: bili.sourcing.ingest
parent: bili.sourcing
state: planned
tags: ["worker:src-ingest"]
name: {zh: "导入并复用主链", en: "Ingest into Main Chain"}
description:
  zh: >
      把已许可、已去重、已归属的内容导入为平台稿件：登记媒体原件、触发转码、提交审核、经目录发布；不新建旁路。
      
  en: >
      Ingest licensed, deduped, attributed content as platform submissions through the existing media/publish chain.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/ingest/src/orchestrator.ts"
  - path: "services/sourcing/ingest/src/stages.ts"
  - path: "services/sourcing/ingest/migrations/0001_ingest.sql"
  - path: "services/sourcing/ingest/tests/ingest.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/ingestions"
    description:
      zh: >
          发起导入
          
      en: >
          Start ingestion
          
    input: {module: "bili.sourcing.ingest", name: "IngestRequest"}
    output: {module: "bili.sourcing.ingest", name: "IngestRun"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/ingestions/{id}"
    description:
      zh: >
          读取导入进度
          
      en: >
          Get ingestion
          
    output: {module: "bili.sourcing.ingest", name: "IngestRun"}
  - protocol: mysql
    path: "ingest_run"
    description:
      zh: >
          导入执行表（唯一写入所有者：导入服务）
          
      en: >
          ingest_run table
          
types:
  - name: "IngestRequest"
    description: {zh: "导入请求", en: "Ingest request"}
    schema: {"type":"object","additionalProperties":false,"description":"导入必须携带许可与归属，缺少两者直接拒绝","properties":{"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"attributionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"导入标题","maxLength":80},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"scheduleAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["assetId","sourceId","licenseId","title","partitionId","ownerId","idempotencyKey"]}
  - name: "IngestRun"
    description: {zh: "导入执行", en: "Ingest run"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 ingest_run；每一步都调用对应领域 API，不直接写对方表","properties":{"runId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["validating","deduping","registering","transcoding","reviewing","publishing","done","failed","cancelled"],"description":"状态机"},"stages":{"type":"array","description":"阶段记录","items":{"type":"object","additionalProperties":false,"properties":{"stage":{"type":"string","description":"阶段"},"state":{"type":"string","description":"状态"},"detail":{"type":"string","description":"细节"},"at":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["stage","state","at"]}},"createdVideoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdSubmissionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"error":{"type":"string","description":"错误"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"finishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["runId","assetId","state","stages"]}
deps:
  - kind: call
    to: bili.sourcing.license
    from_api: "POST /api/v1/sourcing/ingestions"
    to_api: "GET /api/v1/sourcing/licenses/{id}"
    label: {zh: "校验许可已核验且用途包含转码", en: "Verify license and uses"}
  - kind: call
    to: bili.sourcing.dedupe
    from_api: "POST /api/v1/sourcing/ingestions"
    to_api: "POST /internal/sourcing/dedupe-check"
    label: {zh: "导入前去重", en: "Dedupe before ingest"}
  - kind: call
    to: bili.media.asset
    label: {zh: "登记媒体原件", en: "Register media asset"}
  - kind: call
    to: bili.media.processing
    label: {zh: "触发探测与转码", en: "Trigger probe and transcode"}
  - kind: call
    to: bili.publish.submission
    label: {zh: "创建稿件并提交审核", en: "Create submission and submit"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "经唯一发布命令上线", en: "Publish via catalog command"}
  - kind: call
    to: bili.sourcing.attribute
    label: {zh: "导入同时写入溯源链", en: "Write provenance chain"}
---
