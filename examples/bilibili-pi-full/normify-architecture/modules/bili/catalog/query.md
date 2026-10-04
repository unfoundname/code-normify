---
uid: 407db6f3
id: bili.catalog.query
parent: bili.catalog
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "目录查询", en: "Catalog queries"}
description:
  zh: >
      按分区/标签/UP 主/合集查询视频，供所有前台消费
  en: >
      Query videos by partition, tag, uploader and collection for every front end
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/catalog/query/src/query.ts"
  - path: "services/catalog/query/tests/query.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/catalog/video-cards"
    description:
      zh: >
          卡片列表（按分区/标签/合集）
      en: >
          Card list by partition, tag or collection
    output: {module: "bili.contract.common", name: "PageResult"}
  - protocol: http
    method: GET
    path: "/api/v1/catalog/uploads/"
    description:
      zh: >
          UP 主稿件列表
      en: >
          Uploader video list
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "VideoCard"
    description: {zh: "视频卡片", en: "Video card"}
    schema: {"type":"object","description":"视频卡片 / Video card","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"uploaderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"投稿用户 ID / Uploader user id"},"uploader":{"$ref":"urn:normify:bili.identity.profile:ProfileView","description":"字段 uploader（语义见对应领域契约） / Field uploader"},"viewCount":{"type":"integer","description":"播放数 / View count"},"danmakuCount":{"type":"integer","description":"弹幕数 / Danmaku count"},"pubdate":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 pubdate（语义见对应领域契约） / Field pubdate"}},"required":["bvid","title","coverUrl","durationMs","uploaderId","uploader","viewCount","danmakuCount","pubdate"]}
  - name: "VideoQueryRequest"
    description: {zh: "视频查询请求", en: "Video query request"}
    schema: {"type":"object","description":"视频查询请求 / Video query request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"}},"required":["bvid"]}
deps:
  - kind: call
    to: bili.catalog.taxonomy
    label: {zh: "分区标签解析", en: "Resolve partitions and tags"}
  - kind: reference
    to: bili.identity.profile
    label: {zh: "卡片展示上传者资料", en: "Uploader profile for cards"}
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
