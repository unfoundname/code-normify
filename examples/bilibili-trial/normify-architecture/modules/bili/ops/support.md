---
uid: 6f01eb20
id: bili.ops.support
parent: bili.ops
state: planned
tags: ["worker:ops-support"]
name: {zh: "客服工单", en: "Customer Support"}
description:
  zh: >
      用户工单分类与流转、客服回复与内部备注、跨域查证（订单/账号/内容）、升级与满意度回访。
      
  en: >
      Ticket categories and routing, agent replies and internal notes, cross-domain lookups, escalation and CSAT.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/support/src/ticket.ts"
  - path: "services/ops/support/src/reply.ts"
  - path: "services/ops/support/migrations/0001_support.sql"
  - path: "services/ops/support/tests/support.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/support/tickets"
    description:
      zh: >
          提交客服工单
          
      en: >
          Create support ticket
          
    input: {module: "bili.ops.support", name: "SupportTicket"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/support/tickets"
    description:
      zh: >
          客服工单列表
          
      en: >
          List tickets
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.support", name: "SupportTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/support/tickets/{id}/reply"
    description:
      zh: >
          客服回复
          
      en: >
          Reply to ticket
          
    input: {module: "bili.ops.support", name: "SupportReply"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/support/tickets/{id}/escalate"
    description:
      zh: >
          升级工单
          
      en: >
          Escalate ticket
          
    input: {module: "bili.ops.support", name: "IssueEscalation"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "support_ticket"
    description:
      zh: >
          客服工单表（唯一写入所有者：客服服务）
          
      en: >
          support_ticket table
          
types:
  - name: "SupportTicket"
    description: {zh: "客服工单", en: "Support ticket"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 support_ticket，索引 state+priority+created_at","properties":{"ticketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"category":{"type":"string","enum":["account","payment","copyright","content","technical","live","other"],"description":"分类"},"subject":{"type":"string","description":"标题","maxLength":120},"description":{"type":"string","description":"描述","maxLength":2000},"attachments":{"type":"array","description":"附件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":9},"priority":{"type":"string","enum":["low","normal","high","urgent"],"description":"优先级"},"state":{"type":"string","enum":["open","pending_user","pending_internal","escalated","resolved","closed","reopened"],"description":"状态机"},"assigneeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"relatedOrderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"relatedTargetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"firstReplyAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"closedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"satisfactionScore":{"type":"integer","description":"满意度 1-5","minimum":0,"maximum":5}},"required":["ticketId","userId","category","subject","state","createdAt"]}
  - name: "SupportReply"
    description: {zh: "工单回复", en: "Support reply"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 support_reply；internal_only=true 的回复不得返回给用户","properties":{"replyId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ticketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"authorRole":{"type":"string","enum":["user","agent","system"],"description":"角色"},"content":{"type":"string","description":"内容","maxLength":2000},"internalOnly":{"type":"boolean","description":"是否仅内部可见"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["replyId","ticketId","authorId","authorRole","content","createdAt"]}
  - name: "IssueEscalation"
    description: {zh: "问题升级", en: "Issue escalation"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 issue_escalation","properties":{"escalationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ticketId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"toTeam":{"type":"string","enum":["moderation","copyright","payment","engineering","security"],"description":"升级目标"},"reason":{"type":"string","description":"升级原因","maxLength":500},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"resolvedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"resolution":{"type":"string","description":"处理结论"}},"required":["escalationId","ticketId","toTeam","reason","createdAt"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "GET /api/v1/ops/support/tickets"
    to_api: "GET /api/v1/orders/{id}"
    label: {zh: "订单与支付查证", en: "Order lookup"}
  - kind: call
    to: bili.identity.account
    label: {zh: "账号状态查证", en: "Account lookup"}
  - kind: call
    to: bili.social.message
    label: {zh: "工单进展通知用户", en: "Notify ticket progress"}
  - kind: call
    to: bili.ops.report
    label: {zh: "内容类工单转举报/申诉", en: "Route content issues to report"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "跨域查证审计", en: "Audit lookups"}
---
