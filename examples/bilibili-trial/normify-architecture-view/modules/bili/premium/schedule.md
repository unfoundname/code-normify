---
uid: cc8881cf
id: bili.premium.schedule
parent: bili.premium
state: planned
tags: ["worker:pm-schedule"]
name: {zh: "排期、追番与评分", en: "Schedule, Follows and Ratings"}
description:
  zh: >
      更新排期表与时区、追番与提醒、评分与短评、试看策略、剧集更新日历。
      
  en: >
      Airing schedule with timezone, follows and reminders, ratings and short reviews, preview policy, calendar.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/premium/schedule/src/schedule.ts"
  - path: "services/premium/schedule/src/follow.ts"
  - path: "services/premium/schedule/migrations/0001_schedule.sql"
  - path: "services/premium/schedule/tests/schedule.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/seasons/{id}/schedule"
    description:
      zh: >
          读取更新排期
          
      en: >
          Get air schedule
          
    output: {module: "bili.premium.schedule", name: "AirSchedule"}
  - protocol: http
    method: POST
    path: "/api/v1/seasons/{id}/follow"
    description:
      zh: >
          追番
          
      en: >
          Follow season
          
    input: {module: "bili.premium.schedule", name: "FollowSeason"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/seasons/{id}/ratings"
    description:
      zh: >
          评分与短评
          
      en: >
          Rate season
          
    input: {module: "bili.premium.schedule", name: "SeasonRating"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "air_schedule"
    description:
      zh: >
          排期表（唯一写入所有者：排期服务）
          
      en: >
          air_schedule table
          
types:
  - name: "AirSchedule"
    description: {zh: "更新排期", en: "Air schedule"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 air_schedule，唯一约束 season_id+episode_id","properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"seasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"episodeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"airAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"timezone":{"type":"string","description":"时区"},"weekday":{"type":"integer","description":"星期几 1-7","minimum":1,"maximum":7},"notifyBeforeMinutes":{"type":"integer","description":"提前通知分钟","minimum":0,"maximum":10080},"state":{"type":"string","enum":["planned","aired","delayed","cancelled"],"description":"状态"}},"required":["scheduleId","seasonId","airAt","state"]}
  - name: "FollowSeason"
    description: {zh: "追番关系", en: "Season follow"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season_follow，唯一约束 user_id+season_id","properties":{"followId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"seasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"notifyEnabled":{"type":"boolean","description":"是否开启更新提醒"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["followId","userId","seasonId","createdAt"]}
  - name: "SeasonRating"
    description: {zh: "评分与短评", en: "Season rating"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season_rating，唯一约束 user_id+season_id","properties":{"ratingId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"seasonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"score":{"type":"integer","description":"评分 1-10","minimum":1,"maximum":10},"content":{"type":"string","description":"短评","maxLength":500},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ratingId","userId","seasonId","score","createdAt"]}
deps:
  - kind: call
    to: bili.premium.bangumi
    label: {zh: "读取分集与状态", en: "Read episodes"}
  - kind: call
    to: bili.social.message
    label: {zh: "更新提醒通知", en: "Airing reminders"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "到点提醒与状态推进任务", en: "Airing jobs"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "评分聚合为投影", en: "Rating aggregate is a projecti"}
---
