---
uid: 2751e5ce
id: bili.infra.notify
parent: bili.infra
state: planned
tags: ["worker:infra-notify"]
name: {zh: "通知通道接入", en: "Notification Channels"}
description:
  zh: >
      短信/推送/邮件未提供：登记模板与渠道绑定，验证码与系统提醒统一走本适配器。
      
  en: >
      SMS/push/email not provided: template and channel bindings; verification and system alerts route here.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/notify/src/channels.ts"
  - path: "services/notify/src/templates.ts"
apis:
  - protocol: amqp
    path: "notify.outbound"
    description:
      zh: >
          出站消息队列（MQ 待接入，当前由 outbox 派发）
          
      en: >
          Outbound message topic
          
    input: {module: "bili.infra.notify", name: "OutboundMessage"}
types:
  - name: "NotificationChannel"
    description: {zh: "通知渠道", en: "Notification channel"}
    schema: {"type":"object","additionalProperties":false,"properties":{"channel":{"type":"string","enum":["sms","email","app_push","web_push","inbox"],"description":"渠道"},"provider":{"type":"string","description":"候选实现或 pending_decision"},"status":{"type":"string","enum":["planned","binding_pending","connected"],"description":"状态"},"dailyQuota":{"type":"integer","description":"日配额","minimum":0}},"required":["channel","status"]}
  - name: "OutboundMessage"
    description: {zh: "出站消息", en: "Outbound message"}
    schema: {"type":"object","additionalProperties":false,"properties":{"messageId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"channel":{"type":"string","description":"渠道"},"templateCode":{"type":"string","description":"模板码"},"recipient":{"type":"string","description":"接收方（手机号/邮箱/用户 id）"},"variablesJson":{"type":"string","description":"模板变量 JSON"},"dedupeKey":{"type":"string","description":"去重键"},"scheduledAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["queued","sent","failed","suppressed"],"description":"状态"}},"required":["messageId","channel","templateCode","recipient","state"]}
deps:
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "短信推送待接入", en: "SMS/push pending"}
---
