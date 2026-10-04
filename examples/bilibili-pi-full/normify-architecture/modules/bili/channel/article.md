---
uid: 16f08b69
id: bili.channel.article
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "专栏", en: "Articles"}
description:
  zh: >
      专栏创作、草稿、审核、发布与专栏目录
  en: >
      Article authoring, drafts, review, publishing and the article catalog
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/article/src/article.ts"
  - path: "services/channel/article/tests/article.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/channel/articles"
    description:
      zh: >
          创建专栏
      en: >
          Create an article
    input: {module: "bili.channel.article", name: "CreateArticleRequest"}
    output: {module: "bili.channel.article", name: "ArticleView"}
  - protocol: http
    method: GET
    path: "/api/v1/channel/articles/"
    description:
      zh: >
          查询专栏
      en: >
          Get an article
    output: {module: "bili.channel.article", name: "ArticleView"}
types:
  - name: "ArticleView"
    description: {zh: "专栏视图", en: "Article view"}
    schema: {"type":"object","description":"专栏视图 / Article view","additionalProperties":false,"properties":{"articleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"专栏 ID / Article id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"authorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 authorId（语义见对应领域契约） / Field authorId"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"readCount":{"type":"integer","description":"字段 readCount（语义见对应领域契约） / Field readCount"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"publishedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发布时间 / Published time"}},"required":["articleId","title","authorId","readCount","auditState"]}
  - name: "CreateArticleRequest"
    description: {zh: "创建专栏请求", en: "Create article request"}
    schema: {"type":"object","description":"创建专栏请求 / Create article request","additionalProperties":false,"properties":{"title":{"type":"string","minLength":1,"description":"标题 / Title"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["title","content","partitionId","tagIds","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.ops.audit
    label: {zh: "专栏内容审核", en: "Article content audit"}
  - kind: call
    to: bili.discover.indexing
    label: {zh: "专栏进入检索", en: "Articles enter search"}
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
