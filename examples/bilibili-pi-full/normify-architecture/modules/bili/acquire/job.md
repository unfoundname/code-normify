---
uid: eb3b1047
id: bili.acquire.job
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "获取任务", en: "Acquisition jobs"}
description:
  zh: >
      下载/抓取任务、限速、重试与失败归档
  en: >
      Download and fetch jobs with rate limits, retry and failure archiving
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/job/src/job.ts"
  - path: "services/acquire/job/tests/job.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/acquire/jobs"
    description:
      zh: >
          创建获取任务
      en: >
          Create an acquisition job
    input: {module: "bili.acquire.job", name: "AcquireJobRequest"}
    output: {module: "bili.acquire.job", name: "AcquireJobView"}
types:
  - name: "AcquireJobRequest"
    description: {zh: "获取任务请求", en: "Acquire job request"}
    schema: {"type":"object","description":"获取任务请求 / Acquire job request","additionalProperties":false,"properties":{"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"targetUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 targetUrl（语义见对应领域契约） / Field targetUrl"},"expectedSha256":{"type":"string","minLength":1,"description":"字段 expectedSha256（语义见对应领域契约） / Field expectedSha256"},"licenseEvidenceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 licenseEvidenceId（语义见对应领域契约） / Field licenseEvidenceId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sourceId","targetUrl","licenseEvidenceId","idempotencyKey","requestContext"]}
  - name: "AcquireJobView"
    description: {zh: "获取任务视图", en: "Acquire job view"}
    schema: {"type":"object","description":"获取任务视图 / Acquire job view","additionalProperties":false,"properties":{"jobId":{"$ref":"urn:normify:bili.contract.common:Id","description":"任务 ID / Job id"},"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"jobState":{"type":"string","enum":["QUEUED","RUNNING","SUCCEEDED","FAILED"],"description":"任务状态 / Job state"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"}},"required":["jobId","sourceId","jobState","attempt"]}
deps:
  - kind: call
    to: bili.media.ingest
    label: {zh: "复用分片上传与原件登记", en: "Reuse chunked upload and"}
  - kind: call
    to: bili.media.storage
    label: {zh: "直写入 OSS 原件", en: "Write the original into OSS"}
  - kind: call
    to: bili.acquire.license
    label: {zh: "下载前要求许可已核验", en: "Require verified license"}
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
