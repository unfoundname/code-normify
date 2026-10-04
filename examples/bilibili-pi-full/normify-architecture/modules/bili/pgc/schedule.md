---
uid: 5a386381
id: bili.pgc.schedule
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "排期", en: "Schedules"}
description:
  zh: >
      更新时间表、日历、提醒与排期变更
  en: >
      Update timetables, calendars, reminders and schedule changes
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/schedule/src/schedule.ts"
  - path: "services/pgc/schedule/tests/schedule.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/pgc/schedules"
    description:
      zh: >
          查询排期日历
      en: >
          Get the schedule calendar
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "EpisodeSchedule"
    description: {zh: "剧集排期", en: "Episode schedule"}
    schema: {"type":"object","description":"剧集排期 / Episode schedule","additionalProperties":false,"properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 scheduleId（语义见对应领域契约） / Field scheduleId"},"seasonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"合集或季度 ID / Season id"},"episodeIndex":{"type":"integer","description":"字段 episodeIndex（语义见对应领域契约） / Field episodeIndex"},"publishAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 publishAt（语义见对应领域契约） / Field publishAt"},"timezone":{"type":"string","minLength":1,"description":"字段 timezone（语义见对应领域契约） / Field timezone"}},"required":["scheduleId","seasonId","episodeIndex","publishAt","timezone"]}
deps:
  - kind: call
    to: bili.social.subscription
    label: {zh: "排期变更通知订阅者", en: "Notify subscribers about"}
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
