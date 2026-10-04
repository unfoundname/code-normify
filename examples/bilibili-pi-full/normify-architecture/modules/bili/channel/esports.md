---
uid: e0ca2497
id: bili.channel.esports
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "游戏与赛事", en: "Games and esports"}
description:
  zh: >
      赛事、赛程、战队、竞猜入口与直播绑定
  en: >
      Tournaments, schedules, teams, prediction entries and live binding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/esports/src/match.ts"
  - path: "services/channel/esports/tests/match.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/channel/matches/"
    description:
      zh: >
          查询赛事
      en: >
          Get a match
    output: {module: "bili.channel.esports", name: "MatchView"}
types:
  - name: "MatchView"
    description: {zh: "赛事视图", en: "Match view"}
    schema: {"type":"object","description":"赛事视图 / Match view","additionalProperties":false,"properties":{"matchId":{"$ref":"urn:normify:bili.contract.common:Id","description":"赛事 ID / Match id"},"gameId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 gameId（语义见对应领域契约） / Field gameId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"startAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 startAt（语义见对应领域契约） / Field startAt"},"status":{"type":"string","enum":["SCHEDULED","LIVE","FINISHED"],"description":"状态 / Status"},"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"}},"required":["matchId","gameId","title","startAt","status"]}
deps:
  - kind: call
    to: bili.live.room
    label: {zh: "绑定赛事直播间", en: "Bind the tournament live room"}
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
