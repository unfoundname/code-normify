---
uid: cdc65bf6
id: bili.live.room
parent: bili.live
state: planned
tags: ["worker:live-room"]
name: {zh: "直播间与推流", en: "Live Rooms and Streaming"}
description:
  zh: >
      开播/关播状态机、推流地址与密钥、清晰度档位、封面标题分区、预约与提醒、观众数与限制。
      
  en: >
      Start/stop state machine, push url and key, resolution profiles, cover/title/category, reservations, limits.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/room/src/room.ts"
  - path: "services/live/room/src/stream-ticket.ts"
  - path: "services/live/room/migrations/0001_live_room.sql"
  - path: "services/live/room/tests/room.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms"
    description:
      zh: >
          创建直播间
          
      en: >
          Create live room
          
    input: {module: "bili.live.room", name: "LiveRoom"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/start"
    description:
      zh: >
          开播并签发推流票据
          
      en: >
          Start stream
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.live.room", name: "LiveStreamTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/stop"
    description:
      zh: >
          关播并触发回放归档
          
      en: >
          Stop stream
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/live/rooms"
    description:
      zh: >
          列出直播间
          
      en: >
          List live rooms
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.live.room", name: "LiveRoom"}
  - protocol: http
    method: GET
    path: "/api/v1/live/rooms/{id}"
    description:
      zh: >
          读取直播间
          
      en: >
          Get live room
          
    output: {module: "bili.live.room", name: "LiveRoom"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/reservations"
    description:
      zh: >
          预约直播
          
      en: >
          Reserve live
          
    input: {module: "bili.live.room", name: "LiveReservation"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "live_room"
    description:
      zh: >
          直播间表（唯一写入所有者：直播间服务）
          
      en: >
          live_room table
          
types:
  - name: "LiveRoom"
    description: {zh: "直播间", en: "Live room"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_room，唯一约束 anchor_id+state 中 living 唯一","properties":{"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"anchorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":60},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"categoryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["offline","preparing","living","restricted","banned","ended"],"description":"状态机"},"resolutionProfiles":{"type":"array","description":"清晰度档位","items":{"type":"string","description":"档位"}},"danmakuEnabled":{"type":"boolean","description":"是否开启弹幕"},"viewerCount":{"type":"integer","description":"当前观众数（投影）","minimum":0},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"restrictReason":{"type":"string","description":"限制原因"}},"required":["roomId","anchorId","title","state"]}
  - name: "LiveStreamTicket"
    description: {zh: "推流票据", en: "Stream ticket"}
    schema: {"type":"object","additionalProperties":false,"description":"票据短时有效，密钥不落明文表","properties":{"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"pushUrl":{"type":"string","description":"推流地址"},"streamKeyRef":{"type":"string","description":"密钥引用（不落明文）"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"allowedProtocols":{"type":"array","description":"允许协议","items":{"type":"string","enum":["rtmp","srt","webrtc","hls"],"description":"协议"}},"maxBitrateKbps":{"type":"integer","description":"最大码率","minimum":100},"backupPushUrl":{"type":"string","description":"备用推流地址"},"issuedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["roomId","pushUrl","expiresAt","allowedProtocols"]}
  - name: "LiveReservation"
    description: {zh: "直播预约", en: "Live reservation"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_reservation，唯一约束 room_id+user_id","properties":{"reservationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"remindBeforeMinutes":{"type":"integer","description":"提前提醒分钟","minimum":1,"maximum":1440},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"notifiedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["reservationId","roomId","userId","createdAt"]}
deps:
  - kind: call
    to: bili.live.anchor
    from_api: "POST /api/v1/live/rooms/{id}/start"
    label: {zh: "校验主播资质", en: "Check anchor qualification"}
  - kind: call
    to: bili.live.replay
    from_api: "POST /api/v1/live/rooms/{id}/stop"
    label: {zh: "关播后生成回放", en: "Create replay on stop"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "开播/关播事件驱动通知与推荐", en: "Live events"}
  - kind: call
    to: bili.social.message
    label: {zh: "预约提醒通知", en: "Reservation reminders"}
---
