---
uid: bc708e3d
id: bili.discovery.behavior
parent: bili.discovery
state: planned
tags: ["worker:disc-behavior"]
name: {zh: "行为与推荐反馈", en: "Behavior and Recommendation Feedback"}
description:
  zh: >
      曝光/点击/播放时长/搜索等行为批量上报、不感兴趣与偏好反馈、会话级归因；行为数据只追加。
      
  en: >
      Batch exposure/click/watch-time/search events, not-interested feedback, session attribution, append-only.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discovery/behavior/src/collect.ts"
  - path: "services/discovery/behavior/src/feedback.ts"
  - path: "services/discovery/behavior/migrations/0001_behavior.sql"
  - path: "services/discovery/behavior/tests/behavior.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/behaviors"
    description:
      zh: >
          批量上报行为
          
      en: >
          Report behaviors
          
    input: {module: "bili.discovery.behavior", name: "BehaviorBatchRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/recommendations/feedback"
    description:
      zh: >
          提交推荐反馈
          
      en: >
          Submit feedback
          
    input: {module: "bili.discovery.behavior", name: "RecommendFeedback"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "behavior_event"
    description:
      zh: >
          行为事件表（唯一写入所有者：行为服务）
          
      en: >
          behavior_event table
          
types:
  - name: "BehaviorEvent"
    description: {zh: "行为事件", en: "Behavior event"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 behavior_event（只追加），按 occurred_at 分区；不写入敏感个人标识","properties":{"eventId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"anonymousId":{"type":"string","description":"匿名标识（未登录）"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"action":{"type":"string","enum":["expose","click","play","pause","finish","like","coin","favorite","share","search","follow","not_interested"],"description":"行为"},"positionMs":{"type":"integer","description":"播放位置毫秒","minimum":0},"dwellMs":{"type":"integer","description":"停留毫秒","minimum":0},"sessionId":{"type":"string","description":"会话 id"},"deviceType":{"type":"string","enum":["web","ios","android","tv","unknown"],"description":"设备"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["eventId","action","targetType","occurredAt"]}
  - name: "RecommendFeedback"
    description: {zh: "推荐反馈", en: "Recommendation feedback"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 recommend_feedback，唯一约束 user_id+target_id+feedback","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"feedback":{"type":"string","enum":["not_interested","less_like","more_like","already_seen","mute_owner","mute_topic"],"description":"反馈"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","targetId","feedback","createdAt"]}
  - name: "BehaviorBatchRequest"
    description: {zh: "行为批量上报", en: "Behavior batch"}
    schema: {"type":"object","additionalProperties":false,"description":"客户端批量上报，服务端按 event_id 幂等去重","properties":{"events":{"type":"array","description":"行为事件","items":{"$ref":"urn:normify:bili.discovery.behavior:BehaviorEvent"},"minItems":1,"maxItems":200},"batchId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["events","batchId"]}
deps:
  - kind: event
    to: bili.contract.core.events
    label: {zh: "行为事件驱动榜单与推荐", en: "Behavior events drive ranking"}
  - kind: call
    to: bili.infra.cache
    label: {zh: "行为聚合缓存", en: "Behavior aggregation cache"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "埋点量与丢弃告警", en: "Alert on dropped events"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "离线重算任务调度", en: "Offline recompute jobs"}
---
