---
uid: db696a43
id: bili.media.transcode
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "转码与多清晰度", en: "Transcoding and quality ladder"}
description:
  zh: >
      转码阶梯、任务下发、产物登记与失败重试
  en: >
      Quality ladder, job dispatch, artifact registration and retry on failure
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/transcode/src/transcode.ts"
  - path: "services/media/transcode/src/ladder.ts"
  - path: "services/media/transcode/tests/transcode.test.ts"
  - path: "services/media/transcode/tests/ladder.test.ts"
apis:
  - protocol: rpc
    path: "media.transcode.dispatch"
    description:
      zh: >
          下发转码任务
      en: >
          Dispatch a transcode job
    input: {module: "bili.media.transcode", name: "TranscodeJob"}
    output: {module: "bili.media.transcode", name: "TranscodeJob"}
  - protocol: http
    method: GET
    path: "/api/v1/media/transcode-jobs/"
    description:
      zh: >
          查询转码任务
      en: >
          List transcode jobs
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "TranscodeJob"
    description: {zh: "转码任务", en: "Transcode job"}
    schema: {"type":"object","description":"转码任务 / Transcode job","additionalProperties":false,"properties":{"jobId":{"$ref":"urn:normify:bili.contract.common:Id","description":"任务 ID / Job id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"qualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"清晰度档位 ID / Quality tier id"},"status":{"type":"string","enum":["QUEUED","RUNNING","SUCCEEDED","FAILED","CANCELLED"],"description":"状态 / Status"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"},"leaseUntil":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"租约到期时间 / Lease expiry"}},"required":["jobId","assetId","qualityId","status","attempt"]}
  - name: "TranscodeLadder"
    description: {zh: "转码阶梯", en: "Quality ladder"}
    schema: {"type":"object","description":"转码阶梯 / Quality ladder","additionalProperties":false,"properties":{"ladderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 ladderId（语义见对应领域契约） / Field ladderId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"qualityIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 qualityIds（语义见对应领域契约） / Field qualityIds"},"drmRequired":{"type":"boolean","description":"字段 drmRequired（语义见对应领域契约） / Field drmRequired"}},"required":["ladderId","assetId","qualityIds","drmRequired"]}
deps:
  - kind: call
    to: bili.media.job
    label: {zh: "领取租约与重试", en: "Lease and retry"}
  - kind: call
    to: bili.media.asset
    label: {zh: "登记转码产物版本", en: "Register artifact versions"}
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
