---
uid: 6a01b82e
id: bili.identity.profile
parent: bili.identity
state: planned
tags: ["worker:id-profile"]
name: {zh: "资料、等级与个人空间", en: "Profile, Level and Space"}
description:
  zh: >
      个人资料、等级经验、个人空间聚合、隐私设置与黑名单；空间聚合只读投影，不写对方数据。
      
  en: >
      Profile, experience level, space aggregation, privacy settings and blacklist.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/profile/src/service.ts"
  - path: "services/identity/profile/src/space.ts"
  - path: "services/identity/profile/migrations/0001_profile.sql"
  - path: "services/identity/profile/tests/profile.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/users/{userId}"
    description:
      zh: >
          读取用户资料
          
      en: >
          Get user profile
          
    output: {module: "bili.identity.profile", name: "UserProfile"}
  - protocol: http
    method: PATCH
    path: "/api/v1/users/me/profile"
    description:
      zh: >
          更新个人资料
          
      en: >
          Update own profile
          
    input: {module: "bili.identity.profile", name: "UserProfile"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: PUT
    path: "/api/v1/users/me/privacy"
    description:
      zh: >
          更新隐私设置
          
      en: >
          Update privacy settings
          
    input: {module: "bili.identity.profile", name: "PrivacySetting"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/users/me/blacklist"
    description:
      zh: >
          加入黑名单
          
      en: >
          Add to blacklist
          
    input: {module: "bili.identity.profile", name: "BlacklistEntry"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/users/{userId}/space"
    description:
      zh: >
          读取个人空间聚合
          
      en: >
          Get user space
          
    output: {module: "bili.identity.profile", name: "UserSpaceView"}
  - protocol: mysql
    path: "user_profile"
    description:
      zh: >
          用户资料表（唯一写入所有者：资料服务）
          
      en: >
          user_profile table
          
types:
  - name: "UserProfile"
    description: {zh: "用户资料", en: "User profile"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 user_profile；头像只存 OSS 资产引用","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"nickname":{"type":"string","description":"昵称","minLength":1,"maxLength":24},"avatarAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"bannerAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"signature":{"type":"string","description":"个性签名","maxLength":120},"gender":{"type":"string","enum":["unknown","male","female","other"],"description":"性别"},"birthdayMonth":{"type":"integer","description":"生日月份（仅月日，不存年份）","minimum":1,"maximum":12},"level":{"type":"integer","description":"等级","minimum":0,"maximum":6},"experience":{"type":"integer","description":"经验值","minimum":0},"verified":{"type":"boolean","description":"是否已实名"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","nickname","level","experience"]}
  - name: "LevelProgress"
    description: {zh: "等级进度", en: "Level progress"}
    schema: {"type":"object","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currentLevel":{"type":"integer","description":"当前等级","minimum":0,"maximum":6},"experience":{"type":"integer","description":"当前经验","minimum":0},"nextLevelExperience":{"type":"integer","description":"下一级所需经验","minimum":0},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","currentLevel","experience","nextLevelExperience"]}
  - name: "PrivacySetting"
    description: {zh: "隐私设置", en: "Privacy setting"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 privacy_setting","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"spaceVisibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"showFavorites":{"type":"boolean","description":"是否公开收藏夹"},"showFollowings":{"type":"boolean","description":"是否公开关注"},"allowStrangerMessage":{"type":"boolean","description":"是否允许陌生人私信"},"allowDanmakuFromStranger":{"type":"boolean","description":"是否允许陌生人弹幕"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","spaceVisibility","updatedAt"]}
  - name: "BlacklistEntry"
    description: {zh: "黑名单条目", en: "Blacklist entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 blacklist_entry，唯一约束 owner_id+blocked_user_id+scope","properties":{"entryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"blockedUserId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"scope":{"type":"string","enum":["all","danmaku","comment","message"],"description":"范围"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["entryId","ownerId","blockedUserId","scope"]}
  - name: "UserSpaceView"
    description: {zh: "个人空间视图", en: "User space view"}
    schema: {"type":"object","additionalProperties":false,"description":"只读聚合视图（事件投影，可重建），不是权威数据","properties":{"profile":{"$ref":"urn:normify:bili.identity.profile:UserProfile"},"stats":{"type":"object","additionalProperties":false,"properties":{"followerCount":{"type":"integer","description":"粉丝数","minimum":0},"followingCount":{"type":"integer","description":"关注数","minimum":0},"videoCount":{"type":"integer","description":"投稿数","minimum":0},"playCount":{"type":"integer","description":"总播放量","minimum":0}},"required":["followerCount","videoCount"]},"latestVideoIds":{"type":"array","description":"最新投稿 id","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"projectionLagSeconds":{"type":"integer","description":"投影滞后秒","minimum":0}},"required":["profile","stats"]}
deps:
  - kind: call
    to: bili.identity.verify
    from_api: "GET /api/v1/users/{userId}"
    label: {zh: "读取实名与未成年状态", en: "Read verification state"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "资料与隐私变更审计", en: "Audit profile changes"}
  - kind: event
    to: bili.contract.core.events
    from_api: "PATCH /api/v1/users/me/profile"
    label: {zh: "发布资料更新事件", en: "Publish profile updated"}
  - kind: dataflow
    to: bili.data.projections
    from_api: "GET /api/v1/users/{userId}/space"
    label: {zh: "空间统计由事件投影产生", en: "Space stats projected from eve"}
  - kind: call
    to: bili.community.coin
    to_api: "GET /api/v1/coins/balance"
    label: {zh: "空间展示硬币徽章", en: "Show coin badge"}
---
