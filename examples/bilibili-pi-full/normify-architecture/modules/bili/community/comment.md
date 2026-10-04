---
uid: 6d3ac314
id: bili.community.comment
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "评论与回复", en: "Comments and replies"}
description:
  zh: >
      根评论/子评论、层级限制、排序与 @ 提醒
  en: >
      Root and child comments, depth limits, ordering and mentions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/comment/src/comment.ts"
  - path: "services/community/comment/tests/comment.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/community/comments"
    description:
      zh: >
          发表评论或回复
      en: >
          Post a comment or reply
    input: {module: "bili.community.comment", name: "CreateCommentRequest"}
    output: {module: "bili.community.comment", name: "CommentView"}
  - protocol: http
    method: GET
    path: "/api/v1/community/comments"
    description:
      zh: >
          评论列表（含层级）
      en: >
          Comment list with nesting
    output: {module: "bili.community.comment", name: "CommentPage"}
  - protocol: http
    method: DELETE
    path: "/api/v1/community/comments/"
    description:
      zh: >
          删除自己的评论
      en: >
          Delete own comment
    input: {module: "bili.community.comment", name: "DeleteCommentRequest"}
types:
  - name: "CommentView"
    description: {zh: "评论视图", en: "Comment view"}
    schema: {"type":"object","description":"评论视图 / Comment view","additionalProperties":false,"properties":{"commentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"评论 ID / Comment id"},"rootId":{"$ref":"urn:normify:bili.contract.common:Id","description":"根评论 ID / Root comment id"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","enum":["VIDEO","ARTICLE","AUDIO","DYNAMIC","COURSE"],"description":"目标对象类型 / Target object type"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"authorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 authorId（语义见对应领域契约） / Field authorId"},"likeCount":{"type":"integer","description":"点赞数 / Like count"},"replyCount":{"type":"integer","description":"评论数 / Reply count"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["commentId","targetId","targetType","content","authorId","likeCount","replyCount","createdAt"]}
  - name: "CreateCommentRequest"
    description: {zh: "发表评论请求", en: "Create comment request"}
    schema: {"type":"object","description":"发表评论请求 / Create comment request","additionalProperties":false,"properties":{"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","enum":["VIDEO","ARTICLE","AUDIO","DYNAMIC","COURSE"],"description":"目标对象类型 / Target object type"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"rootId":{"$ref":"urn:normify:bili.contract.common:Id","description":"根评论 ID / Root comment id"},"replyToCommentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 replyToCommentId（语义见对应领域契约） / Field replyToCommentId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["targetId","targetType","content","idempotencyKey","requestContext"]}
  - name: "DeleteCommentRequest"
    description: {zh: "删除评论请求", en: "Delete comment request"}
    schema: {"type":"object","description":"删除评论请求 / Delete comment request","additionalProperties":false,"properties":{"commentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"评论 ID / Comment id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["commentId","idempotencyKey","requestContext"]}
  - name: "CommentPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.community.comment:CommentView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.identity.security
    label: {zh: "评论风控与频率限制", en: "Comment risk control and rate"}
  - kind: call
    to: bili.message.notify
    label: {zh: "回复与提及提醒", en: "Reply and mention"}
  - kind: call
    to: bili.ops.audit
    label: {zh: "命中词库评论送审", en: "Send matched comments to audit"}
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
