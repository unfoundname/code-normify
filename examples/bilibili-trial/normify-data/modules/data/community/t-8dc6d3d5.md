---
uid: 5914a6cf
id: data.community.t-8dc6d3d5
parent: data.community
state: planned
tags: ["worker:com-comment", "projection:data-contract"]
name: {zh: "CommentRecord", en: "CommentRecord"}
description:
  zh: >
      评论
  en: >
      Comment
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/community/t-8dc6d3d5.json"
apis: []
types:
  - name: "CommentRecord"
    description: {zh: "评论", en: "Comment"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 comment，索引 target_type+target_id+created_at、root_comment_id；计数列为事件投影","properties":{"commentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"targetType":{"type":"string","enum":["video","dynamic","article","course","audio"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"rootCommentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"parentCommentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"authorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"content":{"type":"string","description":"正文","minLength":1,"maxLength":1000},"atUserIds":{"type":"array","description":"@ 的用户","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"maxItems":10},"imageAssetIds":{"type":"array","description":"配图资产","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"maxItems":9},"likeCount":{"type":"integer","description":"点赞数（投影）","minimum":0},"replyCount":{"type":"integer","description":"回复数（投影）","minimum":0},"pinned":{"type":"boolean","description":"是否置顶"},"featured":{"type":"boolean","description":"是否精选"},"state":{"type":"string","enum":["visible","hidden_by_owner","deleted","under_review","blocked"],"description":"状态"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["commentId","targetType","targetId","authorId","content","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
