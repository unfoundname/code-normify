---
uid: 395c962d
id: bili.community.favorite
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "收藏夹", en: "Favorites"}
description:
  zh: >
      多收藏夹、默认夹、私密夹、批量移动与失效检测
  en: >
      Multiple folders, default folder, private folders, bulk move and invalid-item detection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/favorite/src/favorite.ts"
  - path: "services/community/favorite/tests/favorite.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/community/favorite-folders"
    description:
      zh: >
          创建收藏夹
      en: >
          Create a favorite folder
    input: {module: "bili.community.favorite", name: "FavoriteFolderRequest"}
    output: {module: "bili.community.favorite", name: "FavoriteFolder"}
  - protocol: http
    method: POST
    path: "/api/v1/community/favorites"
    description:
      zh: >
          收藏或取消收藏
      en: >
          Add or remove a favorite
    input: {module: "bili.community.favorite", name: "FavoriteToggleRequest"}
  - protocol: http
    method: GET
    path: "/api/v1/community/favorites"
    description:
      zh: >
          收藏列表
      en: >
          List favorites
    output: {module: "bili.community.favorite", name: "FavoritePage"}
types:
  - name: "FavoriteFolder"
    description: {zh: "收藏夹", en: "Favorite folder"}
    schema: {"type":"object","description":"收藏夹 / Favorite folder","additionalProperties":false,"properties":{"folderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 folderId（语义见对应领域契约） / Field folderId"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"itemCount":{"type":"integer","description":"字段 itemCount（语义见对应领域契约） / Field itemCount"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["folderId","ownerId","title","visibility","itemCount","createdAt"]}
  - name: "FavoriteToggleRequest"
    description: {zh: "收藏开关请求", en: "Favorite toggle request"}
    schema: {"type":"object","description":"收藏开关请求 / Favorite toggle request","additionalProperties":false,"properties":{"folderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 folderId（语义见对应领域契约） / Field folderId"},"targetId":{"type":"string","minLength":1,"description":"目标对象 ID / Target object id"},"targetType":{"type":"string","minLength":1,"description":"目标对象类型 / Target object type"},"favorited":{"type":"boolean","description":"字段 favorited（语义见对应领域契约） / Field favorited"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["folderId","targetId","targetType","favorited","idempotencyKey","requestContext"]}
  - name: "FavoriteItemView"
    description: {zh: "收藏条目视图", en: "Favorite item view"}
    schema: {"type":"object","description":"收藏条目视图 / Favorite item view","additionalProperties":false,"properties":{"folderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 folderId（语义见对应领域契约） / Field folderId"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","minLength":1,"description":"目标对象类型 / Target object type"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["folderId","targetId","targetType","title","createdAt"]}
  - name: "FavoritePage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.community.favorite:FavoriteItemView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "FavoriteFolderRequest"
    description: {zh: "收藏夹写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Favorite folder write request carrying only client-provided fields"}
    schema: {"type":"object","description":"收藏夹写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Favorite folder write request carrying only client-provided fields","additionalProperties":false,"properties":{"folderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 folderId（语义见对应领域契约） / Field folderId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["folderId","title","visibility","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.privacy
    label: {zh: "私密收藏可见性", en: "Private favorite visibility"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
