---
uid: 4688565d
id: data.social.t-91fbd4b1
parent: data.social
state: planned
tags: ["worker:soc-feed", "projection:data-contract"]
name: {zh: "DynamicRecord", en: "DynamicRecord"}
description:
  zh: >
      动态
  en: >
      Dynamic
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/social/t-91fbd4b1.json"
apis: []
types:
  - name: "DynamicRecord"
    description: {zh: "动态", en: "Dynamic"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 dynamic；转发只存引用不复制正文","properties":{"dynamicId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"authorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"type":{"type":"string","enum":["text","image","video","article","audio","live_start","repost","collection_update"],"description":"类型"},"text":{"type":"string","description":"正文","maxLength":2000},"imageAssetIds":{"type":"array","description":"图片资产","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"maxItems":9},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"articleId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"repostOfId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"topicIds":{"type":"array","description":"话题","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"visibility":{"$ref":"urn:normify:data.contract.t-44cc0b8c:Visibility"},"state":{"type":"string","enum":["published","hidden","deleted","under_review"],"description":"状态"},"likeCount":{"type":"integer","description":"点赞数（投影）","minimum":0},"commentCount":{"type":"integer","description":"评论数（投影）","minimum":0},"publishedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["dynamicId","authorId","type","visibility","state","publishedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-44cc0b8c
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
