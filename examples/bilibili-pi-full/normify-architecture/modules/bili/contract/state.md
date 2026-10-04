---
uid: 74aee565
id: bili.contract.state
parent: bili.contract
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "状态机与播放授权", en: "State machines and playback grant"}
description:
  zh: >
      媒体处理、审核、发布三个独立状态机与统一 PlaybackGrant
  en: >
      Three independent state machines plus the unified PlaybackGrant
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "contracts/types/state.ts"
  - path: "contracts/tests/state.test.mjs"
apis:
  - protocol: file
    path: "contracts/types/state.ts"
    description:
      zh: >
          状态机与授权契约入口
      en: >
          State machine and grant contract entry
types:
  - name: "MediaProcessState"
    description: {zh: "媒体处理状态机", en: "Media process state machine"}
    schema: {"type":"object","description":"媒体处理状态机 / Media process state machine","additionalProperties":false,"properties":{"state":{"type":"string","enum":["UPLOADED","PROBING","TRANSCODING","READY","FAILED","QUARANTINED"],"description":"状态 / State"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["state"]}
  - name: "AuditState"
    description: {zh: "审核状态机", en: "Audit state machine"}
    schema: {"type":"object","description":"审核状态机 / Audit state machine","additionalProperties":false,"properties":{"state":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"状态 / State"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["state"]}
  - name: "PublishState"
    description: {zh: "发布状态机", en: "Publish state machine"}
    schema: {"type":"object","description":"发布状态机 / Publish state machine","additionalProperties":false,"properties":{"state":{"type":"string","enum":["DRAFT","SCHEDULED","PUBLISHING","PUBLISHED","PRIVATE","REMOVED","DELETED"],"description":"状态 / State"},"changedBy":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 changedBy（语义见对应领域契约） / Field changedBy"},"changedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 changedAt（语义见对应领域契约） / Field changedAt"}},"required":["state","changedBy","changedAt"]}
  - name: "PlaybackGrant"
    description: {zh: "统一播放授权", en: "Unified playback grant"}
    schema: {"type":"object","description":"统一播放授权 / Unified playback grant","additionalProperties":false,"properties":{"grantId":{"$ref":"urn:normify:bili.contract.common:Id","description":"播放授权 ID / Playback grant id"},"subjectId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subjectId（语义见对应领域契约） / Field subjectId"},"resourceType":{"$ref":"urn:normify:bili.contract.common:PlayableResourceType","description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"allowed":{"type":"boolean","description":"是否允许播放 / Whether playback is allowed"},"reason":{"type":"string","enum":["GRANTED","NEED_LOGIN","NEED_VIP","REGION_LOCKED","LICENSE_EXPIRED","UNDER_REVIEW","DELETED","AGE_LIMITED"],"description":"原因或理由 / Reason"},"qualityIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 qualityIds（语义见对应领域契约） / Field qualityIds"},"region":{"type":"string","minLength":1,"description":"地域代码 / Region code"},"expiresAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 expiresAt（语义见对应领域契约） / Field expiresAt"},"playUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 playUrl（语义见对应领域契约） / Field playUrl"},"token":{"type":"string","minLength":1,"description":"票据 / Token"}},"required":["grantId","subjectId","resourceType","resourceId","allowed","reason","qualityIds","region","expiresAt"]}
---
