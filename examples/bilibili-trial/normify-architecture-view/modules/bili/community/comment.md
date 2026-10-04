---
uid: 2448c987
id: bili.community.comment
parent: bili.community
state: planned
tags: ["worker:com-comment"]
name: {zh: "评论与回复", en: "Comments and Replies"}
description:
  zh: >
      评论/回复/楼中楼、置顶与精选、UP 主管理、举报入口与计数投影；目标对象可为视频/动态/专栏/课程。
      
  en: >
      Comments, replies, pinning, featuring, up-owner moderation, reporting and counter projections.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/comment/src/service.ts"
  - path: "services/community/comment/src/moderation.ts"
  - path: "services/community/comment/migrations/0001_comment.sql"
  - path: "services/community/comment/tests/comment.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/comments"
    description:
      zh: >
          列出目标下的评论
          
      en: >
          List comments
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.community.comment", name: "CommentPage"}
  - protocol: http
    method: POST
    path: "/api/v1/comments"
    description:
      zh: >
          发表评论或回复
          
      en: >
          Post comment
          
    input: {module: "bili.community.comment", name: "CommentPostRequest"}
    output: {module: "bili.community.comment", name: "CommentRecord"}
  - protocol: http
    method: DELETE
    path: "/api/v1/comments/{id}"
    description:
      zh: >
          删除自己的评论
          
      en: >
          Delete own comment
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/comments/{id}/moderation"
    description:
      zh: >
          置顶/精选/隐藏/删除
          
      en: >
          Moderate comment
          
    input: {module: "bili.community.comment", name: "CommentModerationRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/comments/{id}/report"
    description:
      zh: >
          举报评论
          
      en: >
          Report comment
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "comment"
    description:
      zh: >
          评论表（唯一写入所有者：评论服务）
          
      en: >
          comment table
          
types:
  - name: "CommentRecord"
    description: {zh: "评论", en: "Comment"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 comment，索引 target_type+target_id+created_at、root_comment_id；计数列为事件投影","properties":{"commentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["video","dynamic","article","course","audio"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"rootCommentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"parentCommentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"正文","minLength":1,"maxLength":1000},"atUserIds":{"type":"array","description":"@ 的用户","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":10},"imageAssetIds":{"type":"array","description":"配图资产","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":9},"likeCount":{"type":"integer","description":"点赞数（投影）","minimum":0},"replyCount":{"type":"integer","description":"回复数（投影）","minimum":0},"pinned":{"type":"boolean","description":"是否置顶"},"featured":{"type":"boolean","description":"是否精选"},"state":{"type":"string","enum":["visible","hidden_by_owner","deleted","under_review","blocked"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["commentId","targetType","targetId","authorId","content","state"]}
  - name: "CommentPostRequest"
    description: {zh: "发表评论请求", en: "Comment post request"}
    schema: {"type":"object","additionalProperties":false,"description":"楼中楼层级限制为 2 层，更深回复折叠到根评论","properties":{"targetType":{"type":"string","enum":["video","dynamic","article","course","audio"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"rootCommentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"parentCommentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"正文","minLength":1,"maxLength":1000},"atUserIds":{"type":"array","description":"@ 的用户","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":10},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["targetType","targetId","content","idempotencyKey"]}
  - name: "CommentPage"
    description: {zh: "评论分页", en: "Comment page"}
    schema: {"type":"object","additionalProperties":false,"description":"列表可由投影提供并标注滞后，写路径始终走权威表","properties":{"items":{"type":"array","description":"评论条目","items":{"$ref":"urn:normify:bili.community.comment:CommentRecord"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"},"pinnedFirst":{"type":"boolean","description":"是否置顶优先"},"source":{"type":"string","enum":["authoritative","projection"],"description":"数据来源"},"projectionLagSeconds":{"type":"integer","description":"投影滞后秒","minimum":0}},"required":["items","page","source"]}
  - name: "CommentModerationRequest"
    description: {zh: "评论管理动作", en: "Comment moderation action"}
    schema: {"type":"object","additionalProperties":false,"description":"仅 UP 主或具备权限码者可用","properties":{"commentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"action":{"type":"string","enum":["pin","unpin","feature","unfeature","hide","delete","restore"],"description":"动作"},"reason":{"type":"string","description":"原因"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["commentId","operatorId","action","idempotencyKey"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/comments"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "校验视频目标可见性", en: "Check target visibility"}
  - kind: call
    to: bili.identity.profile
    from_api: "POST /api/v1/comments"
    to_api: "GET /api/v1/users/{userId}"
    label: {zh: "黑名单与隐私校验", en: "Blacklist check"}
  - kind: call
    to: bili.community.reaction
    label: {zh: "同步点赞计数投影", en: "Like counter projection"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "评论事件驱动通知与计数", en: "Comment events feed notificati"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "列表读取可走投影", en: "Read path may use projections"}
---
