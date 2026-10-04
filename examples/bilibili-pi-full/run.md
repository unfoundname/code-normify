# 本轮任务：全部由 pi 实际完成

用户要求：“现在再跑一下完整 bilibili 的建立的需求，给我一份内容看看架构和分支分工。”随后强调：“请注意，要全部使用 pi 完成，因为到时候具体的都是使用 pi 完成的。”

你就是本次唯一的设计执行者 pi。请读取本目录 requirements.md 的完整产品范围，再使用本轮已接通的 Normify 0.7.0 工具，实际生成、校验、保存、渲染架构、数据结构与分支分工。不能只给口头回答、假调用、缩减目标或让根助手替你补业务产物。

## 本轮覆盖旧提示的执行配置

- 工作目录是 <repo-root>/examples/bilibili-pi-full。
- 此目录中的 project 是此次隔离的规划仓库；所有新产物、脚本、Git 操作只发生在本目录或其 project 中。不修改 code-normify 源代码，不改 PromptManager，不操作旧 bilibili-trial。
- 本轮启用 read/write/edit/powershell 与 mcp/mcpScript。旧 requirements.md 中“shell/write 未启用”和“只两个 MCP 服务”的说明已被本节覆盖。用 powershell 执行 Node/Git；不要把 Windows 路径用 cmd/跨 shell 拼接做删除。无需删除旧文件。
- MCP 服务 architecture、data、delivery 的源码根均绑定本目录 project，结构目录分别为 normify-architecture、normify-data、normify-delivery。各提供 43 个工具；目录不可通过工具参数改写。
- 可只读现有 examples/bilibili-trial 作为历史参考，但所有设计、契约修订、分组与验收定义均由你决定、通过工具重新保存。本轮不能只复制历史产物后声称重跑。
- 不连接用户服务器/RDS/OSS，不下载视频，不部署，不实现视频网站业务；仅生成设计契约、测试 fixture、规划基线与验收说明/脚本。所有功能仍是 planned。
- 不读取、输出或写入密钥。不访问本机其他 MCP 服务。模型凭据已经由 pi 配置提供。

## 输出目标

1. **完整架构图**：覆盖 requirements.md 的全部 18 项范围，后端、React 各领域前端、共享契约、迁移、基础设施、系统装配都有明确模块和独占未来文件。类型、请求响应、事件须具体；重要状态机、金额账本、幂等、版权/来源、播放授权须统一。禁止使用实体记录代替不符合语义的创建请求；业务枚举须覆盖对应完整产品类型。使用 architecture 的 graph_validate/graph_put 保存并渲染。
2. **完整数据结构图**：由你生成真实实体及关系模型，标明 RDS/OSS/搜索投影归属、写入所有者、主外键、唯一键、索引和基数，明确 API DTO 与数据库实体的区别。所有领域均有数据建模，不只机械复制 User/Video/Comment 或把全部 DTO 当表。使用 data 的 graph_validate/graph_put 保存并渲染。
3. **正式分支计划**：在 architecture 结构目录实际保存通过校验的 branch-plan.json。以“可独立验证的业务交付单元”分组，一个组可包含多个前后端模块和若干 Worker；禁止每接口或每叶子一个组。共享文件/原子业务必须同组或明确拆开文件。全体非废弃架构叶子恰好覆盖一次。
4. **分支分工图**：将你正式保存的 BranchPlan 投影到 delivery 服务的同一种 Normify graph 契约，展示组、模块范围、真实 needs、外部依赖策略、写入范围、需求/验收场景。软件调用关系与 needs 分开；不把运行时箭头自动作为任务先后。
5. **可读交付报告** report.md 与入口 index.html：展示全范围架构总览、数据模型、分支列表、可并行阶段、每组负责内容/文件/需求/依赖/验收、资源缺口和实际执行证据。入口须链接三张工具生成的图，用户能下钻。保留完整 architecture.json、data.json、branch-plan.json、branch-packets.json、worker-plan.json、verification.json。报告里的规模和成功信息必须由实际工具结果计算。

## 真实调用分支工具

- 先 normify_schema_get / normify_help 查看真实 schema，尤其 branch_plan。本目录 normify-tool-guide.md 是工具工作流参考，其相对文档链接指向源码仓库 docs/SPEC.zh-CN.md。
- 你自行在 project 初始化 Git，生成合理的规划/fixture/共享契约基线并提交，取得实际完整 commit OID。不得使用全零 OID、HEAD 字符串或借父仓库当基线。提交仅限隔离 project，禁止提交/推送主仓库。
- 调用 normify_branch_plan_suggest({id,title,base_commit,scope,requirement_ids,together})，保留原始候选。suggest 生成的是同一种 BranchPlan，但要求你编辑补齐业务分组、需求、验收和外部策略，不得把 ready:false 当已经完成。
- 使用相同 BranchPlan 形态修订 units。scope 覆盖全架构根；每个 unit.modules 只列具体叶子。requirement_ids 与每组具体场景完整覆盖用户需求。together 表示明确同组约束；同一真实文件不可跨组写入。
- commands 使用真实 argv 数组和相对 cwd；cases 指向命令与正式需求；resources 明确 database/port/filesystem/service 的组内隔离策略。独立业务验收命令可以是待实现测试路径，但必须明确未执行，不伪造业务通过。能够现在执行的设计/fixture验收要实际执行并单独标记其证明范围。
- external_dependencies 必须精确覆盖有效外部引用，包括祖先容器依赖、容器目标展开叶子、API 类型和 schema $ref。使用 baseline（固定 commit 内已有非空源码）、contract（基线或本组独占写范围内的 fixture）、after（明确 needs 前置链）等策略，不能保留 unresolved。为独立开发提供具体可信的 fixture/契约样例，不用一个无意义空对象给所有依赖凑数。
- 实际调用 validate 修正全部 error，get 取得 CAS digest，put 保存正式计划；每组调用 branch_packet，并调用 branch_plan_export({lead_ref: 明确的示例模板引用})。输出只匹配宿主字段；不得宣称 PromptManager 已创建工作树、Worker 或消费 base_commit/after。
- 只要返回未完成/校验失败，就继续诊断修复。架构改变导致计划过期时重新确认并保存，不直接换摘要冒充复核。

## 展示及最终核验

- 可以创建 Node 脚本协助构造你设计的图、fixture与报告，但持久化架构/数据/计划必须经过 Normify MCP 工具，不直接绕过验证写工具源数据目录。
- 若需批量处理，可使用 mcpScript 调用多次工具并只打印规模/诊断摘要，避免将全图重复输出给上下文。完整结果写入此目录。
- 图必须可打开且字段完整。可使用当前仓库已有 playwright 只读浏览器验收（通过 Node 绝对 import），或复用现有截图流程。不要进行额外安装或修改全局环境。
- 最后从已保存图/计划读取计算：模块/叶子/类型/API/实体/交付组数、覆盖/独占文件/needs DAG/外部策略/需求验收定义的校验结果。静态声明检查、fixture检查和真实业务验收必须明确分开。
- 中文最终回复给出实际产物路径与规模、可并行安排、资源待配置项和宿主接线边界。整个任务完成后退出，留下会话与工具调用证据。
