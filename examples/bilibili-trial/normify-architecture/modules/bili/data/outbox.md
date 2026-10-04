---
uid: 4a59d562
id: bili.data.outbox
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "outbox 与任务租约表", en: "Outbox and Job Lease Tables"}
description:
  zh: >
      outbox_event / job_lease / dead_letter_event 三表契约：与业务写同事务、行锁领取、死信重放。
      
  en: >
      outbox_event, job_lease and dead_letter_event table contracts.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/schema/core/outbox_event.sql"
  - path: "db/schema/core/job_lease.sql"
apis:
  - protocol: mysql
    path: "outbox_event"
    description:
      zh: >
          发件箱表（唯一写入所有者：各域业务事务）
          
      en: >
          Outbox table
          
    output: {module: "bili.contract.adapters.rds", name: "OutboxRecord"}
  - protocol: mysql
    path: "job_lease"
    description:
      zh: >
          任务租约表（唯一写入所有者：任务派发器）
          
      en: >
          Job lease table
          
    output: {module: "bili.contract.adapters.rds", name: "JobLease"}
types:
  - name: "OutboxTable"
    description: {zh: "outbox_event 表", en: "outbox_event table"}
    schema: {"type":"object","additionalProperties":false,"description":"表名固定，禁止各域自建发件箱","properties":{"table":{"type":"string","description":"表名固定 outbox_event"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"indexes":{"type":"array","description":"索引：status+next_attempt_at、aggregate_id+aggregate_version 唯一","items":{"type":"string","description":"索引"}},"retentionDays":{"type":"integer","description":"已发布记录保留天数","minimum":1},"ownerModule":{"type":"string","description":"写入所有者：业务模块同事务写入，派发器只改状态"}},"required":["table","columns","indexes","ownerModule"]}
  - name: "JobLeaseTable"
    description: {zh: "job_lease 表", en: "job_lease table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名固定 job_lease"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"leaseTtlSeconds":{"type":"integer","description":"租约 TTL 秒","minimum":30},"reclaimPolicy":{"type":"string","enum":["auto_requeue","dead_letter_after_max_attempts"],"description":"过期回收策略"},"ownerModule":{"type":"string","description":"写入所有者：任务派发器"}},"required":["table","columns","leaseTtlSeconds","reclaimPolicy","ownerModule"]}
  - name: "DeadLetterTable"
    description: {zh: "dead_letter_event 表", en: "dead_letter_event table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名固定 dead_letter_event"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"replayAuditRequired":{"type":"boolean","description":"重放是否必须审计留痕"},"ownerModule":{"type":"string","description":"写入所有者：任务派发器"}},"required":["table","columns","ownerModule"]}
---
