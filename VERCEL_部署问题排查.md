# Vercel 部署问题排查指南

## Network Error 问题排查

如果访问 https://purin-food-analyzer.vercel.app/ 后出现 "Network Error"，请按以下步骤排查：

### 1. 检查环境变量配置

**最重要：确保在 Vercel 中配置了环境变量**

1. 登录 Vercel Dashboard
2. 进入项目设置 (Settings)
3. 点击 "Environment Variables" (环境变量)
4. 添加以下三个环境变量：

```
ARK_API_KEY = d3c412ec-e817-415d-b896-6803f29a639a
ARK_ENDPOINT_ID = ep-20251214002916-lthkj
ARK_API_URL = https://ark.cn-beijing.volces.com/api/v3/responses
```

5. **重要**：配置后需要重新部署项目
   - 进入 "Deployments" 标签
   - 点击最新的部署右侧的 "..." 菜单
   - 选择 "Redeploy"

### 2. 检查浏览器控制台

1. 打开网站 https://purin-food-analyzer.vercel.app/
2. 按 F12 打开开发者工具
3. 切换到 "Console" (控制台) 标签
4. 上传图片并点击"开始识别"
5. 查看控制台中的错误信息

常见错误：
- `Network Error` - 通常是API调用失败
- `401 Unauthorized` - API密钥错误
- `404 Not Found` - API路由不存在
- `500 Internal Server Error` - 服务器内部错误

### 3. 检查 Vercel 函数日志

1. 登录 Vercel Dashboard
2. 进入项目的 "Functions" 标签
3. 查看 `/api/analyze` 函数的日志
4. 查看是否有错误信息

### 4. 检查网络请求

1. 打开开发者工具 (F12)
2. 切换到 "Network" (网络) 标签
3. 上传图片并点击"开始识别"
4. 查看 `/api/analyze` 请求：
   - 状态码是什么？
   - 响应内容是什么？
   - 请求头是否正确？

### 5. 常见问题及解决方案

#### 问题1：环境变量未配置
**症状**：Network Error 或 500 错误
**解决**：按照步骤1配置环境变量并重新部署

#### 问题2：API密钥无效
**症状**：401 Unauthorized
**解决**：检查 `ARK_API_KEY` 是否正确

#### 问题3：豆包API服务不可用
**症状**：连接超时或网络错误
**解决**：
- 检查豆包API服务状态
- 确认API URL是否正确
- 检查网络连接

#### 问题4：图片格式或大小问题
**症状**：400 Bad Request
**解决**：
- 确保图片格式为 JPG、PNG 或 WEBP
- 确保图片大小不超过 10MB

### 6. 测试步骤

1. **测试环境变量**
   - 在 Vercel 函数日志中查看是否有环境变量相关的警告

2. **测试API路由**
   - 直接访问：`https://purin-food-analyzer.vercel.app/api/analyze`
   - 应该返回 405 Method Not Allowed（这是正常的，因为需要POST请求）

3. **测试完整流程**
   - 上传一张清晰的包含食物的图片
   - 点击"开始识别"
   - 观察控制台和网络请求

### 7. 调试技巧

#### 查看详细错误信息
在浏览器控制台中运行：
```javascript
// 查看当前页面的错误
console.log('检查错误信息');
```

#### 检查API响应
在 Network 标签中：
1. 点击 `/api/analyze` 请求
2. 查看 "Response" 标签
3. 查看返回的JSON数据

### 8. 联系支持

如果以上步骤都无法解决问题，请提供以下信息：
1. 浏览器控制台的完整错误信息
2. Network 标签中 `/api/analyze` 请求的详细信息
3. Vercel 函数日志中的错误信息
4. 使用的图片格式和大小

## 快速检查清单

- [ ] 环境变量已配置（ARK_API_KEY, ARK_ENDPOINT_ID, ARK_API_URL）
- [ ] 环境变量配置后已重新部署
- [ ] 浏览器控制台没有JavaScript错误
- [ ] Network 请求状态码正常（200）
- [ ] 图片格式和大小符合要求
- [ ] 豆包API服务正常

