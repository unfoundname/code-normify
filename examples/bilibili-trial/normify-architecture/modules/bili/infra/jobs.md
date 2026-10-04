---
uid: ea80c46b
id: bili.infra.jobs
parent: bili.infra
state: planned
tags: ["worker:infra-jobs"]
name: {zh: "任务与 outbox 派发", en: "Jobs and Outbox Dispatcher"}
description:
  zh: >
      轮询 outbox 发布事件、按租约领取媒体/审核/结算任务、指数退避重试与死信重放；MQ 为显式迁移目标。
      
  en: >
      Poll outbox, lease jobs, retry with backoff, dead-letter replay. MQ is an explicit migration target.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/jobs/src/dispatcher.ts"
  - path: "services/jobs/src/lease-worker.ts"
  - path: "services/jobs/tests/dispatcher.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/internal/jobs/dispatch"
    description:
      zh: >
          执行一轮派发：领取租约并推进 outbox
          
      en: >
          Run one dispatch round
          
    input: {module: "bili.infra.jobs", name: "JobSchedule"}
    output: {module: "bili.infra.jobs", name: "DispatcherRun"}
  - protocol: http
    method: POST
    path: "/internal/jobs/dead-letter/{id}/replay"
    description:
      zh: >
          人工重放死信
          
      en: >
          Replay dead letter
          
    input: {module: "bili.contract.core.events", name: "DeadLetterEvent"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "RetryPolicy"
    description: {zh: "重试策略", en: "Retry policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"maxAttempts":{"type":"integer","description":"最大尝试次数","minimum":1},"baseDelaySeconds":{"type":"integer","description":"基础退避秒数","minimum":1},"maxDelaySeconds":{"type":"integer","description":"最大退避秒数","minimum":1},"jitter":{"type":"boolean","description":"是否加入抖动"},"onExhausted":{"type":"string","enum":["dead_letter","manual_replay","alert_only"],"description":"耗尽行为"}},"required":["maxAttempts","baseDelaySeconds","onExhausted"]}
  - name: "DispatcherRun"
    description: {zh: "派发轮次", en: "Dispatcher run"}
    schema: {"type":"object","additionalProperties":false,"properties":{"runId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"finishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"published":{"type":"integer","description":"已发布事件数","minimum":0},"failed":{"type":"integer","description":"失败数","minimum":0},"leased":{"type":"integer","description":"本轮领取任务数","minimum":0},"topics":{"type":"array","description":"涉及主题","items":{"type":"string","description":"主题"}}},"required":["runId","startedAt"]}
  - name: "JobSchedule"
    description: {zh: "任务调度登记", en: "Job schedule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"jobType":{"type":"string","description":"任务类型"},"priority":{"type":"integer","description":"优先级","minimum":0,"maximum":9},"concurrency":{"type":"integer","description":"并发度","minimum":1},"timeoutSeconds":{"type":"integer","description":"单次超时秒数","minimum":1},"retry":{"$ref":"urn:normify:bili.infra.jobs:RetryPolicy"}},"required":["jobType","concurrency","retry"]}
deps:
  - kind: call
    to: bili.data.outbox
    to_api: "mysql:outbox_event"
    label: {zh: "读取并推进 outbox 行", en: "Advance outbox rows"}
  - kind: call
    to: bili.contract.adapters.bus
    label: {zh: "经总线适配器发布事件", en: "Publish through bus adapter"}
  - kind: call
    to: bili.contract.adapters.rds
    label: {zh: "获取租约与事务能力", en: "Lease and transaction"}
---
