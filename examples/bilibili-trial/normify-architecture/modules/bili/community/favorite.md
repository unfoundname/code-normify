---
uid: 4a5e4036
id: bili.community.favorite
parent: bili.community
state: planned
tags: ["worker:com-favorite"]
name: {zh: "收藏夹", en: "Favorites"}
description:
  zh: >
      多收藏夹、默认收藏夹、条目排序与备注、公开/私密控制与失效视频标记。
      
  en: >
      Multiple folders, default folder, item ordering and notes, public/private control and invalid items.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/favorite/src/service.ts"
  - path: "services/community/favorite/migrations/0001_favorite.sql"
  - path: "services/community/favorite/tests/favorite.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/favorites/folders"
    description:
      zh: >
          创建收藏夹
          
      en: >
          Create folder
          
    input: {module: "bili.community.favorite", name: "FavoriteFolder"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/favorites/items"
    description:
      zh: >
          收藏视频
          
      en: >
          Add favorite
          
    input: {module: "bili.community.favorite", name: "FavoriteMoveRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/favorites/folders/{id}/items"
    description:
      zh: >
          列出收藏条目
          
      en: >
          List favorite items
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.community.favorite", name: "FavoriteItem"}
  - protocol: http
    method: DELETE
    path: "/api/v1/favorites/items/{id}"
    description:
      zh: >
          取消收藏
          
      en: >
          Remove favorite
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "favorite_folder"
    description:
      zh: >
          收藏夹表（唯一写入所有者：收藏服务）
          
      en: >
          favorite_folder table
          
types:
  - name: "FavoriteFolder"
    description: {zh: "收藏夹", en: "Favorite folder"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 favorite_folder，唯一约束 owner_id+name","properties":{"folderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"名称","minLength":1,"maxLength":50},"description":{"type":"string","description":"简介","maxLength":500},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"defaultFolder":{"type":"boolean","description":"是否默认收藏夹"},"itemCount":{"type":"integer","description":"条目数","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["folderId","ownerId","name","visibility","defaultFolder"]}
  - name: "FavoriteItem"
    description: {zh: "收藏条目", en: "Favorite item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 favorite_item，唯一约束 folder_id+video_id","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"folderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"note":{"type":"string","description":"备注","maxLength":200},"addedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"invalid":{"type":"boolean","description":"原视频是否已下架/失效"}},"required":["itemId","folderId","videoId","addedAt"]}
  - name: "FavoriteMoveRequest"
    description: {zh: "收藏移动请求", en: "Favorite move"}
    schema: {"type":"object","additionalProperties":false,"description":"支持一次收藏到多个收藏夹","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"fromFolderIds":{"type":"array","description":"来源收藏夹","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"toFolderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["videoId","toFolderId","idempotencyKey"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "GET /api/v1/favorites/folders/{id}/items"
    to_api: "GET /api/v1/catalog/videos"
    label: {zh: "读取可见性决定公开收藏夹内容", en: "Visibility decides public list"}
  - kind: call
    to: bili.community.reaction
    label: {zh: "收藏计入互动记录与计数", en: "Favorite reflected in reaction"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "收藏事件驱动计数投影", en: "Favorite events drive counters"}
---
