# Vercel 部署说明

## 问题分析

在 Vercel 部署后出现 `ERR_CONNECTION_CLOSED` 错误的主要原因：

1. **Vercel 免费版超时限制**：免费版 Hobby 计划的 serverless 函数有 **10 秒**的执行时间限制
2. **API 调用时间过长**：豆包 API 处理图片识别可能需要较长时间，超过 10 秒限制
3. **环境变量未配置**：Vercel 部署时需要单独配置环境变量

## 解决方案

### 1. 配置 Vercel 环境变量

在 Vercel 控制台配置以下环境变量：

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 `Purin_food_analyzer`
3. 进入 **Settings** → **Environment Variables**
4. 添加以下环境变量：

```
ARK_API_KEY=d3c412ec-e817-415d-b896-6803f29a639a
ARK_ENDPOINT_ID=ep-20251214002916-lthkj
ARK_API_URL=https://ark.cn-beijing.volces.com/api/v3/responses
```

5. 确保环境变量应用到所有环境（Production、Preview、Development）
6. 点击 **Save** 保存
7. **重要**：修改环境变量后，需要重新部署项目才能生效

### 2. 重新部署

配置环境变量后，有两种方式重新部署：

**方式1：通过 Git 推送触发**
```bash
git commit --allow-empty -m "触发重新部署以应用环境变量"
git push
```

**方式2：在 Vercel Dashboard**
1. 进入项目的 **Deployments** 页面
2. 找到最新的部署
3. 点击 **⋯** (三个点) → **Redeploy**

### 3. 优化建议

#### 3.1 使用更小的图片
- 建议图片大小小于 **2MB**
- 在上传前压缩图片可以显著减少处理时间

#### 3.2 升级到 Vercel Pro（可选）
如果需要更长的超时时间：
- Vercel Pro 计划支持最长 **60 秒**的执行时间
- 可以修改 `vercel.json` 中的 `maxDuration` 为 30 或 60

#### 3.3 查看函数日志
如果问题仍然存在：
1. 在 Vercel Dashboard 进入项目的 **Functions** 页面
2. 查看 `/api/analyze` 函数的日志
3. 检查错误信息和处理时间

## 代码改进

已实施的改进：

1. ✅ **添加了超时处理**：fetch 请求设置了 8 秒超时
2. ✅ **添加了环境变量检查**：在 API 路由中检查环境变量是否配置
3. ✅ **改进了错误处理**：更详细的错误信息和状态码
4. ✅ **添加了处理时间日志**：便于调试和监控
5. ✅ **创建了 vercel.json**：配置函数超时时间

## 常见问题

### Q: 为什么会出现 ERR_CONNECTION_CLOSED？
**A:** 这通常表示：
- API 调用超过了 Vercel 的 10 秒超时限制
- 环境变量未正确配置
- 网络连接问题

### Q: 如何确认环境变量已配置？
**A:** 
1. 在 Vercel Dashboard 的 Environment Variables 页面检查
2. 查看函数日志，如果看到"环境变量未配置"的错误，说明环境变量未正确设置

### Q: 可以增加超时时间吗？
**A:** 
- Vercel 免费版：最大 10 秒（已配置）
- Vercel Pro：可以设置为 30 或 60 秒

### Q: 如何优化性能？
**A:**
1. 使用更小的图片（建议 < 2MB）
2. 在上传前压缩图片
3. 考虑使用图片压缩库在客户端预处理

## 测试步骤

1. ✅ 确认环境变量已配置
2. ✅ 重新部署项目
3. ✅ 上传一张小图片（< 2MB）测试
4. ✅ 查看 Vercel 函数日志确认处理时间
5. ✅ 如果仍然超时，尝试更小的图片或考虑升级计划

## 监控和调试

### 查看函数日志
1. Vercel Dashboard → 项目 → **Functions**
2. 点击 `/api/analyze` 函数
3. 查看 **Logs** 标签页

### 关键日志信息
- `开始处理图片，大小: X MB`
- `处理完成，耗时: X ms`
- `分析失败:` (如果有错误)

如果处理时间接近或超过 10 秒，说明需要优化或升级计划。
