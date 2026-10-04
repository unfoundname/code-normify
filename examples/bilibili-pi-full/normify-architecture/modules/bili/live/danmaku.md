---
uid: b643c0e5
id: bili.live.danmaku
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "直播实时弹幕", en: "Live realtime danmaku"}
description:
  zh: >
      高并发房间消息、房间分片、序号与限流
  en: >
      High-concurrency room messages, sharding, sequence and rate limits
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/danmaku/src/live-danmaku.ts"
  - path: "services/live/danmaku/tests/live-danmaku.test.ts"
apis:
  - protocol: ws
    path: "/ws/live-danmaku"
    description:
      zh: >
          直播弹幕长连接
      en: >
          Live danmaku websocket
    input: {module: "bili.live.danmaku", name: "LiveDanmakuFrame"}
    output: {module: "bili.live.danmaku", name: "LiveDanmakuFrame"}
types:
  - name: "LiveDanmakuFrame"
    description: {zh: "直播弹幕帧", en: "Live danmaku frame"}
    schema: {"type":"object","description":"直播弹幕帧 / Live danmaku frame","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"sequence":{"type":"integer","description":"字段 sequence（语义见对应领域契约） / Field sequence"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"text":{"type":"string","minLength":1,"description":"文本内容 / Text"},"sentAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 sentAt（语义见对应领域契约） / Field sentAt"}},"required":["roomId","sequence","userId","text","sentAt"]}
deps:
  - kind: call
    to: bili.danmaku.preference
    label: {zh: "复用屏蔽与偏好", en: "Reuse blocking and preferences"}
  - kind: call
    to: bili.danmaku.send
    label: {zh: "复用发送校验与风控", en: "Reuse send validation and risk"}
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
