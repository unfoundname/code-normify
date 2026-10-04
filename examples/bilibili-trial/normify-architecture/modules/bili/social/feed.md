---
uid: 8fa98732
id: bili.social.feed
parent: bili.social
state: planned
tags: ["worker:soc-feed"]
name: {zh: "动态与话题", en: "Dynamics and Topics"}
description:
  zh: >
      图文/视频/转发/直播开播动态、话题与话题页、合集订阅、关注流与推荐流装配。
      
  en: >
      Text/video/repost/live dynamics, topics, collection subscriptions, following and recommended feeds.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/feed/src/publish.ts"
  - path: "services/social/feed/src/timeline.ts"
  - path: "services/social/feed/migrations/0001_dynamic.sql"
  - path: "services/social/feed/tests/feed.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/dynamics"
    description:
      zh: >
          发布动态
          
      en: >
          Publish dynamic
          
    input: {module: "bili.social.feed", name: "DynamicPublishRequest"}
    output: {module: "bili.social.feed", name: "DynamicRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/dynamics/feed"
    description:
      zh: >
          读取动态流
          
      en: >
          Get feed
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.social.feed", name: "FeedPage"}
  - protocol: http
    method: GET
    path: "/api/v1/dynamics/{id}"
    description:
      zh: >
          读取单条动态
          
      en: >
          Get dynamic
          
    output: {module: "bili.social.feed", name: "DynamicRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/topics"
    description:
      zh: >
          创建或关联话题
          
      en: >
          Create topic
          
    input: {module: "bili.social.feed", name: "TopicRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "dynamic"
    description:
      zh: >
          动态表（唯一写入所有者：动态服务）
          
      en: >
          dynamic table
          
types:
  - name: "DynamicRecord"
    description: {zh: "动态", en: "Dynamic"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 dynamic；转发只存引用不复制正文","properties":{"dynamicId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["text","image","video","article","audio","live_start","repost","collection_update"],"description":"类型"},"text":{"type":"string","description":"正文","maxLength":2000},"imageAssetIds":{"type":"array","description":"图片资产","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":9},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"articleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"repostOfId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"topicIds":{"type":"array","description":"话题","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"state":{"type":"string","enum":["published","hidden","deleted","under_review"],"description":"状态"},"likeCount":{"type":"integer","description":"点赞数（投影）","minimum":0},"commentCount":{"type":"integer","description":"评论数（投影）","minimum":0},"publishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["dynamicId","authorId","type","visibility","state","publishedAt"]}
  - name: "DynamicPublishRequest"
    description: {zh: "发布动态请求", en: "Publish dynamic request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"type":{"type":"string","enum":["text","image","video","article","audio","repost"],"description":"类型"},"text":{"type":"string","description":"正文","maxLength":2000},"imageAssetIds":{"type":"array","description":"图片资产","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":9},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"repostOfId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"topicNames":{"type":"array","description":"话题名（不存在则创建）","items":{"type":"string","description":"话题名","maxLength":40},"maxItems":5},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["type","visibility","idempotencyKey"]}
  - name: "TopicRecord"
    description: {zh: "话题", en: "Topic"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 topic，唯一约束 name","properties":{"topicId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"话题名","minLength":1,"maxLength":40},"description":{"type":"string","description":"简介","maxLength":500},"dynamicCount":{"type":"integer","description":"动态数（投影）","minimum":0},"hotScore":{"type":"integer","description":"热度分（投影）","minimum":0},"state":{"type":"string","enum":["active","frozen","banned"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["topicId","name","state"]}
  - name: "FeedPage"
    description: {zh: "动态流分页", en: "Feed page"}
    schema: {"type":"object","additionalProperties":false,"description":"关注流读权威+缓存，推荐流读投影","properties":{"items":{"type":"array","description":"动态条目","items":{"$ref":"urn:normify:bili.social.feed:DynamicRecord"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"},"kind":{"type":"string","enum":["following","recommend","topic","user","collection"],"description":"流类型"},"rankingVersion":{"type":"string","description":"排序策略版本"},"source":{"type":"string","enum":["authoritative","projection"],"description":"数据来源"}},"required":["items","page","kind","source"]}
deps:
  - kind: call
    to: bili.social.follow
    from_api: "GET /api/v1/dynamics/feed"
    label: {zh: "读取关注列表装配关注流", en: "Read followings for timeline"}
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/dynamics"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "视频动态引用已发布视频", en: "Video dynamics reference publi"}
  - kind: call
    to: bili.community.comment
    label: {zh: "动态评论复用统一评论能力", en: "Reuse unified comments"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "动态事件驱动推荐与通知", en: "Dynamic events feed recommend "}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "推荐流来自投影", en: "Recommend feed from projection"}
---
