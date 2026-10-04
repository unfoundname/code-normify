---
uid: 808bb906
id: data.content.video-audit-record
parent: data.content
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "视频审核记录", en: "Video audit record"}
description:
  zh: >
      审核结论与策略版本
  en: >
      Audit decisions and policy versions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/video_audit_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_video_audit_record"
    description:
      zh: >
          权威表 content_video_audit_record（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table content_video_audit_record (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/video_audit_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VideoAuditRecordRow"
    description: {zh: "审核结论与策略版本", en: "Audit decisions and policy versions"}
    schema: {"type":"object","additionalProperties":false,"description":"审核结论与策略版本 / Audit decisions and policy versions｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 content_video_audit_record；主键 PK(id)；无唯一约束；索引 INDEX(bvid,decidedAt)；外键 FK(bvid→data.content.video.id, operatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"policyId":{"type":"string","description":"policyId 字段 / Field policyId"},"operatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"reason":{"type":"string","enum":["POLICY_VIOLATION","COPYRIGHT","SPAM","MANUAL","APPEAL_OVERTURNED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"decidedAt":{"type":"string","format":"date-time","description":"decidedAt 字段 / Field decidedAt"}},"required":["id","bvid","auditState","policyId","decidedAt"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
  - kind: reference
    to: data.identity.user
    label: {zh: "operatorId→user.id，多对一", en: "operatorId->user.id,"}
---
