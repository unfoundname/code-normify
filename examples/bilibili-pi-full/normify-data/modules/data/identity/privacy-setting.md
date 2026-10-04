---
uid: ec1de747
id: data.identity.privacy-setting
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "隐私设置", en: "Privacy setting"}
description:
  zh: >
      关注/收藏可见性与私信权限
  en: >
      Follow and favorite visibility plus message permission
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/privacy_setting.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_privacy_setting"
    description:
      zh: >
          权威表 identity_privacy_setting（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_privacy_setting (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/privacy_setting.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PrivacySettingRow"
    description: {zh: "关注/收藏可见性与私信权限", en: "Follow and favorite visibility plus message permission"}
    schema: {"type":"object","additionalProperties":false,"description":"关注/收藏可见性与私信权限 / Follow and favorite visibility plus message permission｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_privacy_setting；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"hideFollowing":{"type":"boolean","description":"hideFollowing 字段 / Field hideFollowing"},"hideFavorites":{"type":"boolean","description":"hideFavorites 字段 / Field hideFavorites"},"allowDmFrom":{"type":"string","enum":["ALL","FOLLOWERS","NONE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"searchable":{"type":"boolean","description":"searchable 字段 / Field searchable"}},"required":["id","userId","hideFollowing","hideFavorites","allowDmFrom","searchable"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
