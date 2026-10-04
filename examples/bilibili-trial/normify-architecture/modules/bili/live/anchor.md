---
uid: da823408
id: bili.live.anchor
parent: bili.live
state: planned
tags: ["worker:live-anchor"]
name: {zh: "主播准入与资质", en: "Anchor Onboarding"}
description:
  zh: >
      主播申请与资料审核、协议签署、实名与年龄校验、分区资质、佣金比例与停播/终止。
      
  en: >
      Anchor application review, agreement signing, real-name/age checks, category qualification, rates, suspension.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/anchor/src/application.ts"
  - path: "services/live/anchor/migrations/0001_anchor.sql"
  - path: "services/live/anchor/tests/anchor.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/anchor-applications"
    description:
      zh: >
          提交主播申请
          
      en: >
          Submit anchor application
          
    input: {module: "bili.live.anchor", name: "AnchorApplication"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/live/anchor-applications/me"
    description:
      zh: >
          查询我的主播状态
          
      en: >
          Get own anchor status
          
    output: {module: "bili.live.anchor", name: "AnchorApplication"}
  - protocol: http
    method: POST
    path: "/api/v1/live/anchor-applications/{id}/decision"
    description:
      zh: >
          审核决定
          
      en: >
          Decide application
          
    input: {module: "bili.live.anchor", name: "AnchorApplication"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "anchor_application"
    description:
      zh: >
          主播申请表（唯一写入所有者：主播服务）
          
      en: >
          anchor_application table
          
types:
  - name: "AnchorApplication"
    description: {zh: "主播申请", en: "Anchor application"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 anchor_application，唯一约束 user_id 进行中唯一","properties":{"applicationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["submitted","doc_review","agreement_pending","approved","rejected","withdrawn"],"description":"状态机"},"primaryCategoryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"realNameVerified":{"type":"boolean","description":"是否已实名"},"ageVerified":{"type":"boolean","description":"是否已成年校验"},"agreementSignedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"submittedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"rejectReason":{"type":"string","description":"驳回原因"},"commissionRateBps":{"type":"integer","description":"分成比例（基点）","minimum":0,"maximum":10000}},"required":["applicationId","userId","state","submittedAt"]}
  - name: "AnchorQualification"
    description: {zh: "主播资质", en: "Anchor qualification"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 anchor_qualification","properties":{"anchorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"level":{"type":"integer","description":"主播等级","minimum":0},"categoryIds":{"type":"array","description":"可开播分区","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["active","suspended","terminated"],"description":"状态"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"suspendReason":{"type":"string","description":"停播原因"}},"required":["anchorId","userId","state","startAt"]}
deps:
  - kind: call
    to: bili.identity.verify
    from_api: "POST /api/v1/live/anchor-applications"
    label: {zh: "实名与年龄校验", en: "Real-name and age check"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "直播资质第三方能力待接入", en: "Third-party qualification pend"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "准入结果事件驱动权限与会话", en: "Onboarding events"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "准入与处罚审计", en: "Audit onboarding decisions"}
---
