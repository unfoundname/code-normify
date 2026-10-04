---
uid: e9089c97
id: bili.social.follow
parent: bili.social
state: planned
tags: ["worker:soc-follow"]
name: {zh: "关注与粉丝", en: "Follows and Followers"}
description:
  zh: >
      关注/取关、关注分组、特别关注、粉丝与互关关系、批量迁移分组；关系为权威表，计数为投影。
      
  en: >
      Follow/unfollow, groups, special follow, follower relations and bulk regrouping.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/follow/src/service.ts"
  - path: "services/social/follow/migrations/0001_follow.sql"
  - path: "services/social/follow/tests/follow.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/follows"
    description:
      zh: >
          关注用户
          
      en: >
          Follow user
          
    input: {module: "bili.social.follow", name: "FollowRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: DELETE
    path: "/api/v1/follows/{followeeId}"
    description:
      zh: >
          取消关注
          
      en: >
          Unfollow
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/follows/groups"
    description:
      zh: >
          创建关注分组
          
      en: >
          Create follow group
          
    input: {module: "bili.social.follow", name: "FollowGroup"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/users/{userId}/follow-stats"
    description:
      zh: >
          读取粉丝统计
          
      en: >
          Get follower stats
          
    output: {module: "bili.social.follow", name: "FollowerStats"}
  - protocol: mysql
    path: "follow_relation"
    description:
      zh: >
          关注关系表（唯一写入所有者：关注服务）
          
      en: >
          follow_relation table
          
types:
  - name: "FollowRelation"
    description: {zh: "关注关系", en: "Follow relation"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 follow_relation，唯一约束 follower_id+followee_id；自关注被约束拒绝","properties":{"relationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"followerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"followeeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"groupId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"special":{"type":"boolean","description":"是否特别关注"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["relationId","followerId","followeeId","createdAt"]}
  - name: "FollowGroup"
    description: {zh: "关注分组", en: "Follow group"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 follow_group，唯一约束 owner_id+name","properties":{"groupId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"分组名","minLength":1,"maxLength":20},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"memberCount":{"type":"integer","description":"成员数","minimum":0}},"required":["groupId","ownerId","name","orderIndex"]}
  - name: "FollowerStats"
    description: {zh: "粉丝统计", en: "Follower stats"}
    schema: {"type":"object","additionalProperties":false,"description":"事件投影，非权威列","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"followerCount":{"type":"integer","description":"粉丝数（投影）","minimum":0},"followingCount":{"type":"integer","description":"关注数（投影）","minimum":0},"mutualCount":{"type":"integer","description":"互关数（投影）","minimum":0},"projectionLagSeconds":{"type":"integer","description":"滞后秒","minimum":0},"asOf":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","followerCount","followingCount"]}
  - name: "FollowRequest"
    description: {zh: "关注请求", en: "Follow request"}
    schema: {"type":"object","additionalProperties":false,"description":"重复关注为幂等成功，不报错","properties":{"followeeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"groupId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"special":{"type":"boolean","description":"是否特别关注"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["followeeId","idempotencyKey"]}
deps:
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/follows"
    to_api: "GET /api/v1/users/{userId}"
    label: {zh: "校验隐私与黑名单", en: "Check privacy and blacklist"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "关注事件驱动动态流与通知", en: "Follow events feed timeline an"}
  - kind: call
    to: bili.infra.cache
    label: {zh: "关注列表缓存", en: "Follow list cache"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "粉丝计数为事件投影", en: "Follower counts are projection"}
---
