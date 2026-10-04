---
uid: 09f272d9
id: bili.creator.income
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "激励收益", en: "Incentive revenue"}
description:
  zh: >
      收益明细、计算规则、结算单与提现
  en: >
      Revenue details, calculation rules, settlement statements and withdrawal
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/income/src/income.ts"
  - path: "services/creator/income/src/settlement.ts"
  - path: "services/creator/income/tests/income.test.ts"
  - path: "services/creator/income/tests/settlement.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/income/:creatorId"
    description:
      zh: >
          按创作者与周期查询收益明细（路径参数与类型化 input 一致）
      en: >
          Query income statements by creator and period
    input: {module: "bili.creator.income", name: "IncomeQueryRequest"}
    output: {module: "bili.creator.income", name: "IncomeStatementPage"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/withdrawals"
    description:
      zh: >
          申请提现
      en: >
          Request a withdrawal
    input: {module: "bili.creator.income", name: "WithdrawRequest"}
    output: {module: "bili.creator.income", name: "IncomeStatement"}
types:
  - name: "IncomeStatement"
    description: {zh: "收益结算单", en: "Income statement"}
    schema: {"type":"object","description":"收益结算单 / Income statement","additionalProperties":false,"properties":{"statementId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 statementId（语义见对应领域契约） / Field statementId"},"creatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creatorId（语义见对应领域契约） / Field creatorId"},"periodStart":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodStart（语义见对应领域契约） / Field periodStart"},"periodEnd":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodEnd（语义见对应领域契约） / Field periodEnd"},"gross":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 gross（语义见对应领域契约） / Field gross"},"fee":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 fee（语义见对应领域契约） / Field fee"},"net":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 net（语义见对应领域契约） / Field net"},"status":{"type":"string","enum":["CALCULATED","CONFIRMED","PAID","FAILED"],"description":"状态 / Status"}},"required":["statementId","creatorId","periodStart","periodEnd","gross","fee","net","status"]}
  - name: "WithdrawRequest"
    description: {zh: "提现请求", en: "Withdrawal request"}
    schema: {"type":"object","description":"提现请求 / Withdrawal request","additionalProperties":false,"properties":{"statementId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 statementId（语义见对应领域契约） / Field statementId"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"accountRef":{"type":"string","minLength":1,"description":"字段 accountRef（语义见对应领域契约） / Field accountRef"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["statementId","amount","accountRef","idempotencyKey","requestContext"]}
  - name: "IncomeStatementPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.creator.income:IncomeStatement"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "IncomeQueryRequest"
    description: {zh: "收益查询请求", en: "Income query request"}
    schema: {"type":"object","description":"收益查询请求 / Income query request","additionalProperties":false,"properties":{"creatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creatorId（语义见对应领域契约） / Field creatorId"},"periodStart":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodStart（语义见对应领域契约） / Field periodStart"},"periodEnd":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodEnd（语义见对应领域契约） / Field periodEnd"}},"required":["creatorId","periodStart","periodEnd"]}
deps:
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "结算分录与应付账户", en: "Settlement entries and payable"}
  - kind: call
    to: bili.ops.service
    label: {zh: "提现审核工单", en: "Withdrawal review ticket"}
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
