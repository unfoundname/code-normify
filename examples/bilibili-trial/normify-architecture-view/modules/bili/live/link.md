---
uid: e18fcebd
id: bili.live.link
parent: bili.live
state: planned
tags: ["worker:live-link"]
name: {zh: "连麦与互动连屏", en: "Co-host and Multi-guest"}
description:
  zh: >
      连麦邀请/接受/结束状态机、RTC 房间与令牌（供应商待决策）、音视频质量档位与违规断麦。
      
  en: >
      Co-host invite/accept/end state machine, RTC room and token (vendor pending), quality profiles, force disconnect.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/link/src/session.ts"
  - path: "services/live/link/src/rtc-adapter.ts"
  - path: "services/live/link/migrations/0001_cohost.sql"
  - path: "services/live/link/tests/cohost.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/cohost-requests"
    description:
      zh: >
          发起连麦邀请
          
      en: >
          Request co-host
          
    input: {module: "bili.live.link", name: "CoHostSession"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/live/cohost-sessions/{id}/accept"
    description:
      zh: >
          接受连麦并签发 RTC 票据
          
      en: >
          Accept co-host
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.live.link", name: "RtcJoinTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/live/cohost-sessions/{id}/end"
    description:
      zh: >
          结束连麦
          
      en: >
          End co-host
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "cohost_session"
    description:
      zh: >
          连麦会话表（唯一写入所有者：连麦服务）
          
      en: >
          cohost_session table
          
types:
  - name: "CoHostSession"
    description: {zh: "连麦会话", en: "Co-host session"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 cohost_session；媒体流本身走 RTC 不落库","properties":{"sessionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"partnerRoomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["requested","accepted","connecting","live","rejected","ended","failed"],"description":"状态机"},"rtcVendor":{"type":"string","enum":["pending_decision","self_hosted","agora","twilio","volcengine"],"description":"RTC 供应商（待决策）"},"qualityProfile":{"type":"string","enum":["audio_only","480p","720p","1080p"],"description":"质量档位"},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endReason":{"type":"string","description":"结束原因"},"layout":{"type":"string","enum":["pip","side_by_side","grid_2x2"],"description":"布局"}},"required":["sessionId","roomId","state","qualityProfile"]}
  - name: "RtcJoinTicket"
    description: {zh: "RTC 入会票据", en: "RTC join ticket"}
    schema: {"type":"object","additionalProperties":false,"description":"令牌短时有效，供应商待接入","properties":{"sessionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"participantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"rtcRoomId":{"type":"string","description":"RTC 房间号"},"token":{"type":"string","description":"入会令牌（短时）"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"role":{"type":"string","enum":["host","guest","audience"],"description":"角色"}},"required":["sessionId","participantId","rtcRoomId","token","expiresAt"]}
deps:
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "RTC 供应商未决策为待接入", en: "RTC vendor pending"}
  - kind: call
    to: bili.live.room
    from_api: "POST /api/v1/live/cohost-requests"
    to_api: "GET /api/v1/live/rooms/{id}"
    label: {zh: "校验双方房间可连麦", en: "Check both rooms"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "连麦事件用于统计与风控", en: "Co-host events"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "违规断麦审计", en: "Audit forced disconnects"}
---
