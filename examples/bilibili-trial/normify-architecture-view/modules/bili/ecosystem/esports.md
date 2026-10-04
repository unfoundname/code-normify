---
uid: b19c8be3
id: bili.ecosystem.esports
parent: bili.ecosystem
state: planned
tags: ["worker:eco-esports"]
name: {zh: "游戏与赛事", en: "Games and Esports"}
description:
  zh: >
      游戏条目、赛事与赛程、参赛队伍与对阵、直播流对接与赛程回放、赛果订阅。
      
  en: >
      Game titles, tournaments and brackets, teams and matches, stream integration, VODs and result subscriptions.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/esports/src/tournament.ts"
  - path: "services/ecosystem/esports/src/match.ts"
  - path: "services/ecosystem/esports/migrations/0001_esports.sql"
  - path: "services/ecosystem/esports/tests/esports.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/esports/tournaments"
    description:
      zh: >
          列出赛事
          
      en: >
          List tournaments
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ecosystem.esports", name: "EsportsTournament"}
  - protocol: http
    method: GET
    path: "/api/v1/esports/matches/{id}"
    description:
      zh: >
          读取对阵与赛果
          
      en: >
          Get match
          
    output: {module: "bili.ecosystem.esports", name: "EsportsMatch"}
  - protocol: http
    method: GET
    path: "/api/v1/esports/games"
    description:
      zh: >
          列出游戏条目
          
      en: >
          List games
          
    output: {module: "bili.ecosystem.esports", name: "GameTitle"}
  - protocol: mysql
    path: "esports_match"
    description:
      zh: >
          赛事对阵表（唯一写入所有者：赛事服务）
          
      en: >
          esports_match table
          
types:
  - name: "GameTitle"
    description: {zh: "游戏条目", en: "Game title"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 game_title","properties":{"gameId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"游戏名","maxLength":80},"publisher":{"type":"string","description":"发行商"},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"categoryIds":{"type":"array","description":"所属分区","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["active","archived"],"description":"状态"},"officialRoomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["gameId","name","state"]}
  - name: "EsportsTournament"
    description: {zh: "赛事", en: "Tournament"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 esports_tournament","properties":{"tournamentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"gameId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"赛事名","maxLength":120},"organizer":{"type":"string","description":"主办方"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"prizePool":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"participantCount":{"type":"integer","description":"参赛队伍数","minimum":0},"state":{"type":"string","enum":["announced","ongoing","finished","cancelled"],"description":"状态"},"mainRoomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["tournamentId","gameId","name","startAt","state"]}
  - name: "EsportsMatch"
    description: {zh: "赛事对阵", en: "Esports match"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 esports_match，索引 tournament_id+scheduled_at","properties":{"matchId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tournamentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"round":{"type":"string","description":"轮次"},"teamA":{"type":"string","description":"队伍 A"},"teamB":{"type":"string","description":"队伍 B"},"scheduledAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"scoreA":{"type":"integer","description":"比分 A","minimum":0},"scoreB":{"type":"integer","description":"比分 B","minimum":0},"state":{"type":"string","enum":["scheduled","live","finished","postponed","cancelled"],"description":"状态"},"streamRoomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"vodVideoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["matchId","tournamentId","teamA","teamB","scheduledAt","state"]}
deps:
  - kind: call
    to: bili.live.room
    from_api: "GET /api/v1/esports/matches/{id}"
    to_api: "GET /api/v1/live/rooms/{id}"
    label: {zh: "赛事直播复用直播间", en: "Reuse live rooms"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "赛事回放关联视频", en: "Match VOD links video"}
  - kind: call
    to: bili.social.message
    label: {zh: "赛程订阅提醒", en: "Schedule reminders"}
  - kind: call
    to: bili.ops.curation
    label: {zh: "赛事入口推荐位", en: "Tournament slot"}
---
