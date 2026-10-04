---
uid: ac2e5ce1
id: data.creator.t-dafcb7df
parent: data.creator
state: planned
tags: ["worker:cre-growth", "projection:data-contract"]
name: {zh: "CreatorTaskProgress", en: "CreatorTaskProgress"}
description:
  zh: >
      任务进度
  en: >
      Task progress
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/creator/t-dafcb7df.json"
apis: []
types:
  - name: "CreatorTaskProgress"
    description: {zh: "任务进度", en: "Task progress"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 creator_task_progress，唯一约束 task_id+owner_id","properties":{"taskId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"currentValue":{"type":"integer","description":"当前值","minimum":0},"targetValue":{"type":"integer","description":"目标值","minimum":1},"completed":{"type":"boolean","description":"是否达成"},"rewardedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["taskId","ownerId","currentValue","targetValue","completed"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
