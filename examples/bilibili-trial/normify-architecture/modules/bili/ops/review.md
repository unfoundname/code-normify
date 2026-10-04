---
uid: dffef3a9
id: bili.ops.review
parent: bili.ops
state: planned
tags: ["worker:ops-review"]
name: {zh: "内容审核", en: "Content Moderation"}
description:
  zh: >
      机审+人审队列、任务领取与 SLA、审核决定与生效动作（下架/拦截/地域屏蔽）、随机抽审；审核状态机独立。
      
  en: >
      Machine plus human review queues, claiming and SLA, decisions with effects, random audit; separate state machine.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/review/src/queue.ts"
  - path: "services/ops/review/src/decide.ts"
  - path: "services/ops/review/migrations/0001_review.sql"
  - path: "services/ops/review/tests/review.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/ops/review/tasks"
    description:
      zh: >
          领取审核队列
          
      en: >
          List review queue
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.review", name: "ReviewTask"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/review/tasks/{id}/claim"
    description:
      zh: >
          领取任务
          
      en: >
          Claim task
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/review/tasks/{id}/decide"
    description:
      zh: >
          提交审核决定
          
      en: >
          Submit decision
          
    input: {module: "bili.ops.review", name: "ReviewDecision"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/review/queue-stats"
    description:
      zh: >
          审核队列指标
          
      en: >
          Queue stats
          
    output: {module: "bili.ops.review", name: "ReviewQueueStats"}
  - protocol: http
    method: POST
    path: "/internal/review/tasks"
    description:
      zh: >
          由领域事件创建审核任务
          
      en: >
          Enqueue review task
          
    input: {module: "bili.ops.review", name: "ReviewTask"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "review_task"
    description:
      zh: >
          审核任务表（唯一写入所有者：审核服务）
          
      en: >
          review_task table
          
types:
  - name: "ReviewTask"
    description: {zh: "审核任务", en: "Review task"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 review_task，索引 state+priority+sla_deadline_at；审核状态机与媒体/发布状态机分离","properties":{"taskId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["video","danmaku","comment","article","dynamic","live_room","course","cover","subtitle","user_profile"],"description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"source":{"type":"string","enum":["auto_enqueue","user_report","appeal","random_audit","copyright_complaint"],"description":"来源"},"priority":{"type":"integer","description":"优先级 0-9","minimum":0,"maximum":9},"state":{"type":"string","enum":["queued","assigned","in_review","approved","rejected","escalated","expired"],"description":"审核状态机"},"assigneeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"machineVerdict":{"type":"string","enum":["pass","block","review","error","skipped"],"description":"机审结论"},"machineLabels":{"type":"array","description":"机器标签","items":{"type":"string","description":"标签"}},"machineScore":{"type":"integer","description":"机器分 0-100","minimum":0,"maximum":100},"slaDeadlineAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"version":{"type":"integer","description":"版本（乐观锁）","minimum":1},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["taskId","targetType","targetId","source","state","createdAt"]}
  - name: "ReviewDecision"
    description: {zh: "审核决定", en: "Review decision"}
    schema: {"type":"object","additionalProperties":false,"description":"决定本身不改业务表，只通过领域命令/事件生效","properties":{"taskId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"decision":{"type":"string","enum":["approve","reject","partial_block","escalate","restore"],"description":"决定"},"reasonCode":{"type":"string","enum":["pornography","violence","illegal","politics","advertisement","spoiler","copyright","privacy","minor_protection","quality","other"],"description":"原因码"},"reasonText":{"type":"string","description":"补充说明","maxLength":500},"effects":{"type":"array","description":"生效动作","items":{"type":"string","enum":["publish_allowed","reject_submission","take_down_video","block_region","hide_danmaku","hide_comment","mute_author","warn_author","freeze_account"],"description":"动作"}},"expectedVersion":{"type":"integer","description":"期望任务版本","minimum":1},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["taskId","operatorId","decision","reasonCode","effects","idempotencyKey"]}
  - name: "ReviewQueueStats"
    description: {zh: "审核队列指标", en: "Review queue stats"}
    schema: {"type":"object","additionalProperties":false,"description":"指标来自审核任务表聚合，非独立权威","properties":{"queueName":{"type":"string","description":"队列名"},"pending":{"type":"integer","description":"待处理","minimum":0},"inProgress":{"type":"integer","description":"处理中","minimum":0},"breachedSla":{"type":"integer","description":"超 SLA","minimum":0},"avgHandleSeconds":{"type":"integer","description":"平均处理秒数","minimum":0},"machineAutoPassRateBps":{"type":"integer","description":"机审直通率（基点）","minimum":0,"maximum":10000},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["queueName","pending","inProgress"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/ops/review/tasks/{id}/decide"
    to_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "驳回或下架经目录命令生效", en: "Takedown via catalog command"}
  - kind: call
    to: bili.danmaku.post
    label: {zh: "弹幕隐藏与拦截", en: "Hide and block danmaku"}
  - kind: call
    to: bili.community.comment
    label: {zh: "评论隐藏与删除", en: "Hide and delete comments"}
  - kind: call
    to: bili.media.artwork
    label: {zh: "封面与字幕审核状态回写", en: "Cover and subtitle review stat"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "审核决定审计留痕", en: "Audit review decisions"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "审核结果事件驱动通知", en: "Review events notify authors"}
---
