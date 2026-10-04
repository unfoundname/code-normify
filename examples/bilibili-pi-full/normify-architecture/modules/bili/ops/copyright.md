---
uid: bd4b9e7d
id: bili.ops.copyright
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "版权投诉", en: "Copyright complaints"}
description:
  zh: >
      侵权投诉受理、证据要求、下架通知与反通知
  en: >
      Complaint intake, evidence requirements, takedown notices and counter-notices
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/copyright/src/copyright.ts"
  - path: "services/ops/copyright/tests/copyright.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/copyright-complaints"
    description:
      zh: >
          受理版权投诉
      en: >
          Accept a copyright complaint
    input: {module: "bili.ops.copyright", name: "CopyrightRequest"}
    output: {module: "bili.ops.copyright", name: "CopyrightComplaint"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/copyright-complaints/takedown"
    description:
      zh: >
          下发下架通知
      en: >
          Issue a takedown
    input: {module: "bili.ops.copyright", name: "TakedownRequest"}
types:
  - name: "CopyrightComplaint"
    description: {zh: "版权投诉", en: "Copyright complaint"}
    schema: {"type":"object","description":"版权投诉 / Copyright complaint","additionalProperties":false,"properties":{"complaintId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 complaintId（语义见对应领域契约） / Field complaintId"},"complainant":{"type":"string","minLength":1,"description":"字段 complainant（语义见对应领域契约） / Field complainant"},"targetBvid":{"type":"string","minLength":1,"description":"字段 targetBvid（语义见对应领域契约） / Field targetBvid"},"claimType":{"type":"string","enum":["VIDEO","AUDIO","IMAGE","ARTICLE"],"description":"字段 claimType（语义见对应领域契约） / Field claimType"},"evidenceUrls":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 evidenceUrls（语义见对应领域契约） / Field evidenceUrls"},"status":{"type":"string","enum":["SUBMITTED","REVIEWING","TAKEDOWN","REJECTED","COUNTER"],"description":"状态 / Status"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["complaintId","complainant","targetBvid","claimType","evidenceUrls","status","createdAt"]}
  - name: "TakedownRequest"
    description: {zh: "下架通知请求", en: "Takedown request"}
    schema: {"type":"object","description":"下架通知请求 / Takedown request","additionalProperties":false,"properties":{"complaintId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 complaintId（语义见对应领域契约） / Field complaintId"},"notifyUploader":{"type":"boolean","description":"字段 notifyUploader（语义见对应领域契约） / Field notifyUploader"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["complaintId","notifyUploader","reason","idempotencyKey","requestContext"]}
  - name: "CopyrightRequest"
    description: {zh: "版权投诉写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Copyright complaint write request carrying only client-provided fields"}
    schema: {"type":"object","description":"版权投诉写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Copyright complaint write request carrying only client-provided fields","additionalProperties":false,"properties":{"complaintId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 complaintId（语义见对应领域契约） / Field complaintId"},"complainant":{"type":"string","minLength":1,"description":"字段 complainant（语义见对应领域契约） / Field complainant"},"targetBvid":{"type":"string","minLength":1,"description":"字段 targetBvid（语义见对应领域契约） / Field targetBvid"},"claimType":{"type":"string","enum":["VIDEO","AUDIO","IMAGE","ARTICLE"],"description":"字段 claimType（语义见对应领域契约） / Field claimType"},"evidenceUrls":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 evidenceUrls（语义见对应领域契约） / Field evidenceUrls"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["complaintId","complainant","targetBvid","claimType","evidenceUrls","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.upload.lifecycle
    label: {zh: "执行下架", en: "Execute removal"}
  - kind: call
    to: bili.acquire.provenance
    label: {zh: "核对来源与许可证据", en: "Check provenance and license"}
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
