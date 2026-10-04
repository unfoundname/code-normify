---
uid: ae88ab1a
id: data.social.season-subscription
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "合集剧集订阅", en: "Season subscription"}
description:
  zh: >
      订阅合集/剧集与提醒开关
  en: >
      Subscriptions to collections or seasons with reminder flags
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/season_subscription.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_season_subscription"
    description:
      zh: >
          权威表 social_season_subscription（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_season_subscription (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/season_subscription.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SeasonSubscriptionRow"
    description: {zh: "订阅合集/剧集与提醒开关", en: "Subscriptions to collections or seasons with reminder flags"}
    schema: {"type":"object","additionalProperties":false,"description":"订阅合集/剧集与提醒开关 / Subscriptions to collections or seasons with reminder flags｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_season_subscription；主键 PK(id)；唯一约束 UNIQUE(userId,seasonId)；无二级索引；外键 FK(userId→data.identity.user.id, seasonId→data.pgc.season.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"notifyNewEpisode":{"type":"boolean","description":"notifyNewEpisode 字段 / Field notifyNewEpisode"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","seasonId","notifyNewEpisode","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
---
