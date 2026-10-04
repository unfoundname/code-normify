---
uid: c1468609
id: data.channel.audio-publish
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "音频作品", en: "Audio work"}
description:
  zh: >
      音频投稿与音质档位
  en: >
      Audio works and quality tiers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/audio_publish.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_audio_publish"
    description:
      zh: >
          权威表 channel_audio_publish（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_audio_publish (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/audio_publish.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AudioPublishRow"
    description: {zh: "音频投稿与音质档位", en: "Audio works and quality tiers"}
    schema: {"type":"object","additionalProperties":false,"description":"音频投稿与音质档位 / Audio works and quality tiers｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_audio_publish；主键 PK(id)；无唯一约束；索引 INDEX(uploaderId,auditState)；外键 FK(uploaderId→data.identity.user.id, assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"uploaderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","uploaderId","title","assetId","durationMs","auditState"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "uploaderId→user.id，多对一", en: "uploaderId->user.id,"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
