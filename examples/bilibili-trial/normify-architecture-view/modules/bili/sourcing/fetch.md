---
uid: 8119fc2f
id: bili.sourcing.fetch
parent: bili.sourcing
state: planned
tags: ["worker:src-fetch"]
name: {zh: "下载任务与限速", en: "Fetch Jobs and Rate Limits"}
description:
  zh: >
      按来源策略创建下载任务、并发与速率限制、断点续传、暂存区落地、失败重试与死信；不下载未许可内容。
      
  en: >
      Policy-bound fetch jobs, concurrency and rate limits, resumable transfer, staging area, retry and dead letter.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/fetch/src/job.ts"
  - path: "services/sourcing/fetch/src/transfer.ts"
  - path: "services/sourcing/fetch/migrations/0001_fetch.sql"
  - path: "services/sourcing/fetch/tests/fetch.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/fetch-jobs"
    description:
      zh: >
          创建下载任务
          
      en: >
          Create fetch job
          
    input: {module: "bili.sourcing.fetch", name: "FetchJob"}
    output: {module: "bili.sourcing.fetch", name: "FetchJob"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/fetch-jobs/{id}"
    description:
      zh: >
          读取任务与断点
          
      en: >
          Get fetch job
          
    output: {module: "bili.sourcing.fetch", name: "FetchJob"}
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/fetch-jobs/{id}/pause"
    description:
      zh: >
          暂停任务
          
      en: >
          Pause job
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/fetch-jobs/{id}/resume"
    description:
      zh: >
          断点续传
          
      en: >
          Resume job
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "fetch_job"
    description:
      zh: >
          下载任务表（唯一写入所有者：获取服务）
          
      en: >
          fetch_job table
          
types:
  - name: "FetchJob"
    description: {zh: "下载任务", en: "Fetch job"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 fetch_job；staging 对象超过保留期自动清理","properties":{"jobId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetUrl":{"type":"string","description":"目标地址"},"state":{"type":"string","enum":["queued","running","paused","succeeded","failed","dead","cancelled"],"description":"状态机"},"priority":{"type":"integer","description":"优先级 0-9","minimum":0,"maximum":9},"bandwidthLimitKbps":{"type":"integer","description":"限速（kbps）","minimum":0},"concurrencyHint":{"type":"integer","description":"并发提示","minimum":1,"maximum":16},"retryCount":{"type":"integer","description":"已重试次数","minimum":0},"maxRetries":{"type":"integer","description":"最大重试次数","minimum":0},"bytesDownloaded":{"type":"integer","description":"已下载字节","minimum":0},"totalBytes":{"type":"integer","description":"总字节（未知为 0）","minimum":0},"checksumSha256":{"type":"string","description":"文件校验和"},"stagingObjectKey":{"type":"string","description":"暂存区对象键"},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"finishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"lastError":{"type":"string","description":"最后错误"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["jobId","sourceId","licenseId","targetUrl","state","priority"]}
  - name: "FetchPolicy"
    description: {zh: "来源获取策略", en: "Fetch policy"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 fetch_policy，唯一约束 source_id","properties":{"sourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"rateLimitPerMinute":{"type":"integer","description":"每分钟请求上限","minimum":1},"maxConcurrency":{"type":"integer","description":"最大并发","minimum":1,"maximum":16},"respectRobots":{"type":"boolean","description":"是否遵守 robots 与条款"},"userAgent":{"type":"string","description":"User-Agent 标识"},"allowedHosts":{"type":"array","description":"允许的主机","items":{"type":"string","description":"域名"}},"maxSizeBytes":{"type":"integer","description":"单资源大小上限","minimum":1},"scheduleWindow":{"type":"string","description":"允许抓取时段（本地时区）"},"state":{"type":"string","enum":["active","paused"],"description":"状态"}},"required":["sourceId","rateLimitPerMinute","maxConcurrency","respectRobots"]}
deps:
  - kind: call
    to: bili.sourcing.license
    from_api: "POST /api/v1/sourcing/fetch-jobs"
    to_api: "GET /api/v1/sourcing/licenses/{id}"
    label: {zh: "仅许可 verified 且", en: "Only verified download license"}
  - kind: call
    to: bili.contract.adapters.oss
    label: {zh: "暂存区对象写入", en: "Write staging objects"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "任务租约、限速与重试", en: "Leases, throttling and retries"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "获取行为审计", en: "Audit fetch activity"}
---
