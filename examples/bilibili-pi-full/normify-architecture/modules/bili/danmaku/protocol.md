---
uid: a1be6e89
id: bili.danmaku.protocol
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "实时弹幕协议", en: "Realtime danmaku protocol"}
description:
  zh: >
      长连接协议、房间分片、消息序号与断线重连回放
  en: >
      Long-lived protocol, room sharding, message sequence and reconnect replay
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/protocol/src/realtime.ts"
  - path: "services/danmaku/protocol/tests/realtime.test.ts"
apis:
  - protocol: ws
    path: "/ws/danmaku"
    description:
      zh: >
          实时弹幕长连接
      en: >
          Realtime danmaku websocket
    input: {module: "bili.danmaku.send", name: "SendDanmakuRequest"}
    output: {module: "bili.danmaku.protocol", name: "RealtimeDanmakuFrame"}
types:
  - name: "RealtimeDanmakuFrame"
    description: {zh: "实时弹幕帧", en: "Realtime danmaku frame"}
    schema: {"type":"object","description":"实时弹幕帧 / Realtime danmaku frame","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"sequence":{"type":"integer","description":"字段 sequence（语义见对应领域契约） / Field sequence"},"item":{"$ref":"urn:normify:bili.danmaku.segment:DanmakuItem","description":"字段 item（语义见对应领域契约） / Field item"}},"required":["bvid","sequence","item"]}
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
