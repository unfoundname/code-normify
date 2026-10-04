---
uid: 19f65ca7
id: bili.media.job
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "媒体任务与租约", en: "Media jobs and leases"}
description:
  zh: >
      任务入队、RDS 租约领取、超时回收、重试与死信
  en: >
      Job enqueue, RDS lease acquisition, timeout reclaim, retry and dead letter
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/job/src/job-lease.ts"
  - path: "services/media/job/tests/job-lease.test.ts"
apis:
  - protocol: rpc
    path: "media.job.lease"
    description:
      zh: >
          领取任务租约
      en: >
          Lease a job
    output: {module: "bili.media.job", name: "JobLease"}
  - protocol: rpc
    path: "media.job.complete"
    description:
      zh: >
          完成任务或安排重试
      en: >
          Complete or reschedule a job
    input: {module: "bili.media.job", name: "JobLease"}
types:
  - name: "JobLease"
    description: {zh: "任务租约", en: "Job lease"}
    schema: {"type":"object","description":"任务租约 / Job lease","additionalProperties":false,"properties":{"jobId":{"$ref":"urn:normify:bili.contract.common:Id","description":"任务 ID / Job id"},"workerId":{"type":"string","minLength":1,"description":"字段 workerId（语义见对应领域契约） / Field workerId"},"leaseUntil":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"租约到期时间 / Lease expiry"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"},"attemptLimit":{"type":"integer","description":"最大重试次数 / Attempt limit"},"payload":{"$ref":"urn:normify:bili.contract.event:EventPayload","description":"事件载荷 / Event payload"}},"required":["jobId","workerId","leaseUntil","attempt","attemptLimit","payload"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "与 outbox 共用任务表与去重语义", en: "Share the outbox table and"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
