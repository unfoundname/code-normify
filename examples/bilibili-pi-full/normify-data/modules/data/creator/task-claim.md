---
uid: 135a1028
id: data.creator.task-claim
parent: data.creator
state: planned
tags: [planned, "worker:W-CREATOR", "storage:rds"]
name: {zh: "任务领取", en: "Task claim"}
description:
  zh: >
      用户任务进度与领取
  en: >
      Per-user task progress and claims
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/task_claim.model.sql"
apis:
  - protocol: rpc
    path: "db.table.creator_task_claim"
    description:
      zh: >
          权威表 creator_task_claim（唯一业务写入所有者：W-CREATOR；RDS 方言与适配器待定）
      en: >
          Authoritative table creator_task_claim (sole write owner: W-CREATOR; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/task_claim.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TaskClaimRow"
    description: {zh: "用户任务进度与领取", en: "Per-user task progress and claims"}
    schema: {"type":"object","additionalProperties":false,"description":"用户任务进度与领取 / Per-user task progress and claims｜存储归属 RDS｜唯一写入所有者 W-CREATOR｜表 creator_task_claim；主键 PK(id)；唯一约束 UNIQUE(taskId,userId)；无二级索引；外键 FK(taskId→data.creator.creator-task.id, userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"taskId":{"type":"string","description":"外键指向 data.creator.creator-task.id（多对一，由 RDS 实施） / Foreign key to data.creator.creator-task.id (many-to-one, enforced by RDS)"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"progress":{"type":"integer","description":"progress 字段 / Field progress"},"claimedAt":{"type":"string","format":"date-time","description":"claimedAt 字段 / Field claimedAt"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"}},"required":["id","taskId","userId","progress","idempotencyKey"]}
deps:
  - kind: reference
    to: data.creator.creator-task
    label: {zh: "taskId→creator-task.id，多对一", en: "taskId->creator-task.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
