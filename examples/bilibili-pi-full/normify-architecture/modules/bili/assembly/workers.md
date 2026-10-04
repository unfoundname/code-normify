---
uid: c97e0cf1
id: bili.assembly.workers
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "Worker 进程装配", en: "Worker process assembly"}
description:
  zh: >
      媒体/审核/投影/推送等后台 Worker 的启动与并发配置
  en: >
      Startup and concurrency configuration for media, audit, projection and push workers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/worker/src/main.ts"
  - path: "apps/worker/src/registry.ts"
  - path: "apps/worker/tests/main.test.ts"
  - path: "apps/worker/tests/registry.test.ts"
apis:
  - protocol: file
    path: "apps/worker/src/main.ts"
    description:
      zh: >
          Worker 进程入口
      en: >
          Worker process entry
types:
  - name: "WorkerRegistration"
    description: {zh: "Worker 注册项", en: "Worker registration"}
    schema: {"type":"object","description":"Worker 注册项 / Worker registration","additionalProperties":false,"properties":{"workerId":{"type":"string","minLength":1,"description":"字段 workerId（语义见对应领域契约） / Field workerId"},"ownerModule":{"type":"string","minLength":1,"description":"字段 ownerModule（语义见对应领域契约） / Field ownerModule"},"concurrency":{"type":"integer","description":"字段 concurrency（语义见对应领域契约） / Field concurrency"},"leaseSec":{"type":"integer","description":"字段 leaseSec（语义见对应领域契约） / Field leaseSec"}},"required":["workerId","ownerModule","concurrency","leaseSec"]}
deps:
  - kind: call
    to: bili.infra.outbox
    label: {zh: "领取 outbox 与任务租约", en: "Claim outbox messages and job"}
  - kind: call
    to: bili.media.job
    label: {zh: "媒体任务消费", en: "Consume media jobs"}
---
