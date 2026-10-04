---
uid: 687f434f
id: data.ops.copyright-complaint
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "版权投诉", en: "Copyright complaint"}
description:
  zh: >
      投诉人、证据与处置
  en: >
      Complainants, evidence and handling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/copyright_complaint.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_copyright_complaint"
    description:
      zh: >
          权威表 ops_copyright_complaint（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_copyright_complaint (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/copyright_complaint.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CopyrightComplaintRow"
    description: {zh: "投诉人、证据与处置", en: "Complainants, evidence and handling"}
    schema: {"type":"object","additionalProperties":false,"description":"投诉人、证据与处置 / Complainants, evidence and handling｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_copyright_complaint；主键 PK(id)；无唯一约束；索引 INDEX(status,createdAt)；外键 FK(targetBvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"complainant":{"type":"string","description":"complainant 字段 / Field complainant"},"targetBvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"claimType":{"type":"string","enum":["VIDEO","AUDIO","IMAGE","ARTICLE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"evidenceUrls":{"type":"array","items":{"type":"string"},"description":"evidenceUrls 字段 / Field evidenceUrls"},"status":{"type":"string","enum":["SUBMITTED","REVIEWING","TAKEDOWN","REJECTED","COUNTER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","complainant","targetBvid","claimType","evidenceUrls","status","createdAt"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "targetBvid→video.id，多对一", en: "targetBvid->video.id,"}
---
