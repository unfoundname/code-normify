---
uid: d6eb1e84
id: bili.danmaku.style
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕样式与渲染参数", en: "Danmaku styles and render parameters"}
description:
  zh: >
      弹幕池、字号颜色、显示区域与防挡设置
  en: >
      Danmaku pool, size and color, display area and anti-occlusion settings
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/style/src/style.ts"
  - path: "services/danmaku/style/tests/style.test.ts"
apis:
  - protocol: rpc
    path: "danmaku.style.resolve"
    description:
      zh: >
          解析稿件生效样式
      en: >
          Resolve effective style for a video
    output: {module: "bili.danmaku.style", name: "DanmakuStyle"}
types:
  - name: "DanmakuStyle"
    description: {zh: "弹幕样式", en: "Danmaku style"}
    schema: {"type":"object","description":"弹幕样式 / Danmaku style","additionalProperties":false,"properties":{"styleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 styleId（语义见对应领域契约） / Field styleId"},"scope":{"type":"string","enum":["SCRIPT","PLATFORM"],"description":"字段 scope（语义见对应领域契约） / Field scope"},"fontSize":{"type":"integer","description":"字段 fontSize（语义见对应领域契约） / Field fontSize"},"alpha":{"type":"number","description":"字段 alpha（语义见对应领域契约） / Field alpha"},"displayAreaPercent":{"type":"integer","description":"字段 displayAreaPercent（语义见对应领域契约） / Field displayAreaPercent"},"scrollSpeed":{"type":"number","description":"字段 scrollSpeed（语义见对应领域契约） / Field scrollSpeed"}},"required":["styleId","scope","fontSize","alpha","displayAreaPercent","scrollSpeed"]}
deps:
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
