---
uid: 22af4de9
id: bili.client.admin.review
parent: bili.client.admin
state: planned
tags: ["worker:adm-review"]
name: {zh: "审核工作台", en: "Moderation Console"}
description:
  zh: >
      审核队列、音视频预览、机审标签、决定与理由码、SLA 倒计时；动作直连审核服务。
      
  en: >
      Review queue, media preview, machine labels, decisions with reason codes and SLA timers.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/admin/src/features/review/index.ts"
  - path: "apps/admin/src/features/review/pages/ReviewQueuePage.tsx"
  - path: "apps/admin/src/features/review/tests/review.test.tsx"
apis: []
types:
  - name: "ReviewConsoleState"
    description: {zh: "审核台状态", en: "Review console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"queue":{"type":"array","description":"任务","items":{"$ref":"urn:normify:bili.ops.review:ReviewTask"}},"stats":{"type":"array","description":"队列指标","items":{"$ref":"urn:normify:bili.ops.review:ReviewQueueStats"}},"activeTaskId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"chosenEffects":{"type":"array","description":"已选生效动作","items":{"type":"string","description":"动作"}},"reasonCode":{"type":"string","description":"原因码"}},"required":["queue"]}
deps:
  - kind: call
    to: bili.ops.review
    to_api: "GET /api/v1/ops/review/tasks"
    label: {zh: "审核队列与决定", en: "Queue and decisions"}
---
