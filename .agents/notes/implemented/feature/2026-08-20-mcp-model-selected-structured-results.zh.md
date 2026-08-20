# Agent Note: Model-selected MCP structured results

Status: implemented

[English](2026-08-20-mcp-model-selected-structured-results.md) | 中文

## 问题

MCP 工具结果将 `content` 中的展示块与 `structuredContent` 中的机器可读数据分开。客户端会保留并验证两者，但 Native 投影只渲染 `content`。当服务器仅在 `content` 中返回简短状态行，而把有用字段全部放入 `structuredContent` 时，模型无法使用下一步决策所需的标识符、cursor 或明细。始终注入结构化数据虽能解决可见性，却会让每次调用都承担其 token 和保留成本。

## 决策

MCP 客户端向每个已发现工具面向模型的输入 schema 添加一个仅由 host 使用的 `responseDetail: "summary" | "full"` 属性。默认值为 `summary`。模型在当前任务需要该次结果的结构化数据时，在同一次工具调用上选择 `full`。客户端会在 `tools/call` 前移除该属性，因此 MCP 服务器保持原有输入 schema 和线上参数。若服务器已经拥有 `responseDetail`，客户端选择第一个可用的确定性数字后缀。

完整响应会把格式化的 `structuredContent` 附加到工具定义拥有的模型投影，同时保持规范 MCP 值不变，供验证、Code Mode 和编程调用方使用。该投影属于本次执行，因此天然与请求它的调用关联，不需要结果标识符或后续工具。

`structuredContentMaxInlineBytes` 限制新增 UTF-8 文本，默认值为 16 KiB。调用存在 session owner 时，超大 JSON 会通过可选的 `ctx.spillStore` 保存；模型收到有界头尾预览、locator 和后端读取指引。没有可用 spill 存储时，预览会说明完整值仍只供编程调用方使用。存储失败不会把成功的 MCP 调用变成错误。

## 曾考虑的替代方案

**始终把 `structuredContent` 序列化进模型上下文。** 否决，因为即使模型不需要结构化字段，摘要调用也会承担数据相关的 token 和保留成本。

**增加一个按 call id 展开结果的独立工具。** 否决，因为它要求模型选择并关联之前的调用、增加一次往返，并把决定与产生所需结果的 MCP 工具分离。

**给每个 MCP 服务器增加详细度参数。** 不作为通用方案，因为这会在各服务器中重复同一展示策略并改变它们的线上 schema。服务器仍可独立提供领域专用的分页或过滤能力。

## 测试

包测试固定了 schema 增强和冲突处理、host 专用参数在发送前移除、规范值保持不变、摘要行为、完整内联投影、有界的无存储预览、存储失败回退以及 spill 支持的读取指引。配置测试固定默认值和允许的字节范围。无需密钥的 stdio E2E fixture 返回简洁 `content` 状态和通过 schema 验证的 `structuredContent`，并证明 `responseDetail: "full"` 能在一次真实 MCP 调用中暴露两者。

## 后果

- 模型可逐次 MCP 调用控制结构化结果可见性，无需第二个工具或关联标识符。
- 每个已发现 MCP 工具承担很小且稳定的详细度 enum schema 成本；只有 `full` 调用承担结构化结果 token。
- 该行为完全位于 Host 端，统一适用于通过此客户端连接的 MCP 服务器；服务器和其他 MCP 客户端不受影响。
- 模型需要在调用时预判是否需要结构化数据。摘要不足时，仍可使用 `full` 重复同一个读取调用。
