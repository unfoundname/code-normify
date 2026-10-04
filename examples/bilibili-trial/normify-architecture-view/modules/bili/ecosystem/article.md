---
uid: 4ac10281
id: bili.ecosystem.article
parent: bili.ecosystem
state: planned
tags: ["worker:eco-article"]
name: {zh: "专栏", en: "Articles"}
description:
  zh: >
      图文专栏编辑与发布、专栏合集、阅读量与互动、审核与专栏标签。
      
  en: >
      Article authoring and publishing, series, read counts and interactions, moderation and labels.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/article/src/service.ts"
  - path: "services/ecosystem/article/migrations/0001_article.sql"
  - path: "services/ecosystem/article/tests/article.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/articles"
    description:
      zh: >
          创建/更新专栏
          
      en: >
          Upsert article
          
    input: {module: "bili.ecosystem.article", name: "ArticleRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/articles/{id}"
    description:
      zh: >
          读取专栏
          
      en: >
          Get article
          
    output: {module: "bili.ecosystem.article", name: "ArticleRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/articles"
    description:
      zh: >
          列出专栏
          
      en: >
          List articles
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ecosystem.article", name: "ArticleRecord"}
  - protocol: mysql
    path: "article"
    description:
      zh: >
          专栏表（唯一写入所有者：专栏服务）
          
      en: >
          article table
          
types:
  - name: "ArticleRecord"
    description: {zh: "专栏文章", en: "Article"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 article；正文存 RDS 文本列，配图存 OSS","properties":{"articleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":80},"summary":{"type":"string","description":"摘要","maxLength":200},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"contentMarkdown":{"type":"string","description":"正文 Markdown","maxLength":200000},"categoryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"wordCount":{"type":"integer","description":"字数","minimum":0},"state":{"type":"string","enum":["draft","in_review","published","rejected","taken_down"],"description":"状态机"},"readCount":{"type":"integer","description":"阅读量（投影）","minimum":0},"likeCount":{"type":"integer","description":"点赞数（投影）","minimum":0},"publishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["articleId","authorId","title","contentMarkdown","state"]}
  - name: "ArticleSeries"
    description: {zh: "专栏合集", en: "Article series"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 article_series，article_series_member 关联表显式建模","properties":{"seriesId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"合集标题","maxLength":80},"articleIds":{"type":"array","description":"文章","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"orderIndex":{"type":"integer","description":"排序","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["seriesId","authorId","title","articleIds"]}
deps:
  - kind: call
    to: bili.ops.review
    from_api: "POST /api/v1/articles"
    to_api: "POST /internal/review/tasks"
    label: {zh: "发布前走统一审核", en: "Review before publish"}
  - kind: call
    to: bili.community.comment
    label: {zh: "评论复用统一能力", en: "Reuse unified comments"}
  - kind: call
    to: bili.community.reaction
    label: {zh: "点赞收藏复用统一互动", en: "Reuse unified reactions"}
  - kind: call
    to: bili.infra.search
    label: {zh: "专栏检索投影", en: "Search projection"}
---
