---
uid: 6d3572df
id: data.playback.playback-grant
parent: data.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", "storage:rds"]
name: {zh: "播放授权", en: "Playback grant"}
description:
  zh: >
      统一授权签发记录：可见性、版权与权益核验结果
  en: >
      Every issued grant with visibility, license and entitlement checks
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/playback_grant.model.sql"
apis:
  - protocol: rpc
    path: "db.table.playback_grant"
    description:
      zh: >
          权威表 playback_grant（唯一业务写入所有者：W-PLAYBACK；RDS 方言与适配器待定）
      en: >
          Authoritative table playback_grant (sole write owner: W-PLAYBACK; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/playback_grant.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PlaybackGrantRow"
    description: {zh: "统一授权签发记录：可见性、版权与权益核验结果", en: "Every issued grant with visibility, license and entitlement checks"}
    schema: {"type":"object","additionalProperties":false,"description":"统一授权签发记录：可见性、版权与权益核验结果 / Every issued grant with visibility, license and entitlement checks｜存储归属 RDS｜唯一写入所有者 W-PLAYBACK｜表 playback_grant；主键 PK(id)；无唯一约束；索引 INDEX(subjectId,issuedAt), INDEX(bvid)；外键 FK(subjectId→data.identity.user.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"subjectId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"allowed":{"type":"boolean","description":"allowed 字段 / Field allowed"},"reason":{"type":"string","enum":["GRANTED","NEED_LOGIN","NEED_VIP","REGION_LOCKED","LICENSE_EXPIRED","UNDER_REVIEW","DELETED","AGE_LIMITED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"qualityIds":{"type":"array","items":{"type":"string"},"description":"qualityIds 字段 / Field qualityIds"},"region":{"type":"string","description":"region 字段 / Field region"},"expiresAt":{"type":"string","format":"date-time","description":"expiresAt 字段 / Field expiresAt"},"issuedAt":{"type":"string","format":"date-time","description":"issuedAt 字段 / Field issuedAt"}},"required":["id","bvid","allowed","reason","qualityIds","region","expiresAt","issuedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "subjectId→user.id，多对一", en: "subjectId->user.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
