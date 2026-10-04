---
uid: d4989ad3
id: bili.ops.report
parent: bili.ops
state: planned
tags: ["worker:ops-report"]
name: {zh: "举报、申诉与处罚", en: "Reports, Appeals and Punishments"}
description:
  zh: >
      举报工单与合并、分级处置、处罚记录与到期自动解除、申诉复核与撤销处罚。
      
  en: >
      Report tickets and merging, triage, punishment records with expiry, appeal review and revocation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/report/src/ticket.ts"
  - path: "services/ops/report/src/punishment.ts"
  - path: "services/ops/report/migrations/0001_report.sql"
  - path: "services/ops/report/tests/report.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/reports"
    description:
      zh: >
          提交举报
          
      en: >
          Submit report
          
    input: {module: "bili.ops.report", name: "ReportTicket"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/reports"
    description:
      zh: >
          举报工单列表
          
      en: >
          List report tickets
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.report", name: "ReportTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/reports/{id}/triage"
    description:
      zh: >
          分级处置（受理/合并/驳回）
          
      en: >
          Triage report
          
    input: {module: "bili.ops.report", name: "ReportTicket"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/punishments"
    description:
      zh: >
          执行处罚
          
      en: >
          Apply punishment
          
    input: {module: "bili.ops.report", name: "PunishmentRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/appeals"
    description:
      zh: >
          提交申诉
          
      en: >
          Submit appeal
          
    input: {module: "bili.ops.report", name: "AppealRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "report_ticket"
    description:
      zh: >
          举报工单表（唯一写入所有者：举报服务）
          
      en: >
          report_ticket table
          
types:
  - name: "ReportTicket"
    description: {zh: "举报工单", en: "Report ticket"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 report_ticket，唯一约束 reporter_id+target_type+target_id 待处理中唯一","properties":{"ticketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["video","danmaku","comment","dynamic","live_room","user","article"],"description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reporterId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reasonCode":{"type":"string","description":"原因码"},"description":{"type":"string","description":"补充说明","maxLength":500},"evidenceAssetIds":{"type":"array","description":"证据附件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":9},"state":{"type":"string","enum":["submitted","triaged","accepted","rejected","merged","appealed"],"description":"状态机"},"priority":{"type":"integer","description":"优先级 0-9","minimum":0,"maximum":9},"mergedIntoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"handledBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ticketId","targetType","targetId","reporterId","reasonCode","state","createdAt"]}
  - name: "PunishmentRecord"
    description: {zh: "处罚记录", en: "Punishment record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 punishment_record；到期由任务自动解除，禁止人工改历史","properties":{"punishmentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"scope":{"type":"string","enum":["account","video","danmaku","comment","live","revenue"],"description":"范围"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["warning","delete_content","mute","ban_login","ban_live","deduct_revenue"],"description":"类型"},"durationHours":{"type":"integer","description":"时长小时（0 表示永久）","minimum":0},"reasonCode":{"type":"string","description":"原因码"},"reasonText":{"type":"string","description":"说明"},"sourceTicketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"effectiveAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"revokedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"revokeReason":{"type":"string","description":"撤销原因"}},"required":["punishmentId","userId","scope","type","reasonCode","operatorId","effectiveAt"]}
  - name: "AppealRequest"
    description: {zh: "申诉", en: "Appeal request"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 appeal_request，唯一约束 punishment_id 申诉一次","properties":{"appealId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"appellantId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"punishmentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"申诉说明","maxLength":1000},"evidenceAssetIds":{"type":"array","description":"证据附件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["submitted","reviewing","accepted","rejected","withdrawn"],"description":"状态机"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"decisionReason":{"type":"string","description":"处理说明"}},"required":["appealId","appellantId","targetId","content","state","createdAt"]}
deps:
  - kind: call
    to: bili.ops.review
    from_api: "POST /api/v1/ops/reports/{id}/triage"
    to_api: "POST /internal/review/tasks"
    label: {zh: "复杂举报转审核队列", en: "Escalate to review queue"}
  - kind: call
    to: bili.social.message
    label: {zh: "处罚与申诉结果通知", en: "Notify punishment and appeal"}
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/ops/punishments"
    to_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "内容类处罚经目录下架", en: "Content punishment via catalog"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "处罚到期自动解除任务", en: "Punishment expiry jobs"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "处罚与撤销审计", en: "Audit punishments"}
---
