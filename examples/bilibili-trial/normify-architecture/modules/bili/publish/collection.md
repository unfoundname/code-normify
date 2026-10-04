---
uid: 3b38b84c
id: bili.publish.collection
parent: bili.publish
state: planned
tags: ["worker:pub-collection"]
name: {zh: "分 P、合集与预约发布", en: "Episodes, Collections and Scheduling"}
description:
  zh: >
      多分 P 组织、合集/系列、合集订阅关系、预约定时发布与冲突检测。
      
  en: >
      Episodes, collections/series, subscriptions and scheduled publishing with conflict detection.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/publish/collection/src/service.ts"
  - path: "services/publish/collection/src/schedule.ts"
  - path: "services/publish/collection/migrations/0001_collection.sql"
  - path: "services/publish/collection/tests/collection.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/collections"
    description:
      zh: >
          创建合集
          
      en: >
          Create collection
          
    input: {module: "bili.publish.collection", name: "CollectionRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/collections/{id}/items"
    description:
      zh: >
          加入合集
          
      en: >
          Add collection item
          
    input: {module: "bili.publish.collection", name: "CollectionItem"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: PUT
    path: "/api/v1/submissions/{id}/episodes"
    description:
      zh: >
          设置多分 P
          
      en: >
          Set episode list
          
    input: {module: "bili.publish.collection", name: "EpisodeBinding"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/submissions/{id}/schedule"
    description:
      zh: >
          设置预约发布
          
      en: >
          Schedule publish
          
    input: {module: "bili.publish.collection", name: "ScheduledPublish"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/collections/{id}"
    description:
      zh: >
          读取合集
          
      en: >
          Get collection
          
    output: {module: "bili.publish.collection", name: "CollectionRecord"}
  - protocol: mysql
    path: "collection"
    description:
      zh: >
          合集表（唯一写入所有者：合集服务）
          
      en: >
          collection table
          
types:
  - name: "EpisodeBinding"
    description: {zh: "分 P 绑定", en: "Episode binding"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 video_episode，唯一约束 video_id+page_index","properties":{"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"pageIndex":{"type":"integer","description":"第几 P（从 1 起）","minimum":1},"title":{"type":"string","description":"分 P 标题","maxLength":80},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["episodeId","videoId","pageIndex","title","assetId"]}
  - name: "CollectionRecord"
    description: {zh: "合集", en: "Collection"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 collection","properties":{"collectionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"合集标题","maxLength":80},"description":{"type":"string","description":"简介","maxLength":1000},"type":{"type":"string","enum":["collection","season","series","course"],"description":"类型"},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"itemCount":{"type":"integer","description":"条目数","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["collectionId","ownerId","title","type","visibility"]}
  - name: "CollectionItem"
    description: {zh: "合集条目", en: "Collection item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 collection_item，唯一约束 collection_id+video_id","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"collectionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"addedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["itemId","collectionId","videoId","orderIndex"]}
  - name: "ScheduledPublish"
    description: {zh: "预约发布", en: "Scheduled publish"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 scheduled_publish；到期由 outbox 派发器触发目录发布命令","properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"publishAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"timezone":{"type":"string","description":"时区，如 Asia/Shanghai"},"state":{"type":"string","enum":["scheduled","dispatched","cancelled","failed","conflict"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"lastError":{"type":"string","description":"最后错误"}},"required":["scheduleId","videoId","publishAt","state"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/submissions/{id}/schedule"
    to_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "预约到期触发目录发布", en: "Schedule triggers catalog publ"}
  - kind: call
    to: bili.publish.submission
    label: {zh: "校验稿件归属与状态", en: "Check submission ownership"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "合集条目变更事件", en: "Collection item events"}
---
