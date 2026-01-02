# 智能对话AI助手

一个现代化的智能对话AI助手应用，支持与AI进行实时对话交流。

## 功能特点

- 🤖 智能对话：支持与AI进行自然语言对话
- 💬 实时交互：流畅的对话体验，支持打字动画效果
- 🎨 现代化UI：美观的渐变色彩设计，响应式布局
- 📱 移动端适配：完美支持手机和平板设备
- 🔄 对话历史：自动保存对话上下文，支持清除历史
- ⚡ 快速响应：优化的前后端架构，快速响应用户请求

## 技术栈

### 前端
- React 18
- Vite
- Axios
- CSS3 (渐变、动画)

### 后端
- Node.js
- Express
- OpenAI API (可选)
- CORS支持

## 前置要求

**重要**：在开始之前，请确保您的系统已安装 Node.js 和 npm。

### 检查是否已安装

```bash
node --version
npm --version
```

如果命令未找到，请先安装 Node.js：

- **macOS**: 推荐使用 Homebrew：`brew install node`
- **详细安装指南**: 请查看 [安装指南.md](./安装指南.md)

### 推荐版本
- Node.js: v18.x 或 v20.x（LTS 版本）
- npm: 会自动随 Node.js 一起安装

## 安装步骤

### 1. 安装依赖

```bash
npm run install-all
```

或者分别安装：

```bash
# 安装根目录依赖
npm install

# 安装服务器依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install
```

### 2. 配置环境变量（可选）

如果需要使用真实的AI API，创建 `server/.env` 文件：

```bash
cd server
```

然后创建 `.env` 文件，添加你的API密钥：

**推荐使用 DeepSeek API（支持流式响应）：**
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3001
```

**或者使用 OpenAI API：**
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

**注意**：
- 如果不配置API密钥，系统将使用模拟AI响应模式，仍然可以正常使用
- DeepSeek API 支持流式响应，体验更好
- 获取 DeepSeek API 密钥：https://platform.deepseek.com/

## 运行项目

### 开发模式（同时启动前后端）

```bash
npm run dev
```

### 分别启动

```bash
# 启动后端服务器（终端1）
npm run server

# 启动前端开发服务器（终端2）
npm run client
```

### 访问应用

- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## 使用说明

1. 打开浏览器访问 http://localhost:3000
2. 在输入框中输入您的问题或消息
3. 按 Enter 发送消息（Shift+Enter 换行）
4. AI助手会实时回复您的问题
5. 点击右上角的删除按钮可以清除对话历史

## API接口

### POST /api/chat
发送消息给AI助手

**请求体：**
```json
{
  "message": "你好",
  "userId": "user-123"
}
```

**响应：**
```json
{
  "response": "您好！我是您的AI助手...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/history/:userId
获取对话历史

### DELETE /api/history/:userId
清除对话历史

### GET /api/health
健康检查接口

## 项目结构

```
.
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   └── ChatInterface.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── *.css          # 样式文件
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                 # 后端Express服务器
│   ├── index.js           # 服务器主文件
│   └── package.json
├── package.json           # 根目录配置
└── README.md
```

## 自定义配置

### 修改端口

- 前端端口：编辑 `client/vite.config.js` 中的 `server.port`
- 后端端口：在 `server/.env` 中设置 `PORT` 或修改 `server/index.js`

### 修改AI模型

编辑 `server/index.js`，修改OpenAI API调用中的 `model` 参数：

```javascript
model: 'gpt-3.5-turbo',  // 或 'gpt-4' 等
```

## 注意事项

1. **API密钥安全**：请勿将 `.env` 文件提交到版本控制系统
2. **生产环境**：部署到生产环境时，请确保：
   - 设置正确的CORS配置
   - 使用HTTPS
   - 配置环境变量
   - 考虑使用数据库存储对话历史

## 故障排除

### 前端无法连接后端
- 确保后端服务器正在运行（端口3001）
- 检查 `client/vite.config.js` 中的代理配置

### API调用失败
- 检查OpenAI API密钥是否正确
- 检查网络连接
- 查看服务器控制台的错误信息

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

