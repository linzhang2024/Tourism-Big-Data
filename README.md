# Tourism-Big-Data

旅游趋势分析平台 - 一个基于 FastAPI 和 React 的现代化旅游数据分析与行程规划系统。

## 项目简介

本项目是一个综合性的旅游趋势分析平台，主要功能包括：

- **旅游趋势分析**：基于历史数据分析旅游热点、价格趋势、季节性模式等
- **智能行程规划**：根据用户偏好和预算，智能生成个性化旅行路线
- **数据可视化**：使用 ECharts 提供丰富的图表展示，直观呈现数据分析结果
- **实时数据获取**：集成爬虫服务，实时获取最新旅游信息

## 技术栈清单

### 后端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Python | 3.8+ | 后端开发语言 |
| FastAPI | 0.109.0+ | 高性能 Web 框架 |
| Uvicorn | 0.27.0+ | ASGI 服务器 |
| Pydantic | 2.5.0+ | 数据验证库 |
| httpx | 0.26.0+ | HTTP 客户端 |
| pandas | 2.1.3+ | 数据处理库 |
| numpy | 1.26.2+ | 数值计算库 |

### 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2.0+ | 前端框架 |
| TypeScript | 5.3.0+ | 类型安全的 JavaScript |
| Vite | 5.0.0+ | 构建工具 |
| ECharts | 6.0.0+ | 数据可视化库 |
| echarts-for-react | 3.0.6+ | ECharts React 封装 |

### 开发测试工具

| 工具 | 说明 |
|------|------|
| Vitest | 前端测试框架 |
| Testing Library | React 组件测试库 |
| pytest | 后端测试框架 |

## 项目结构

```
Tourism-Big-Data/
├── backend/                # 后端代码
│   ├── app/               # FastAPI 应用
│   │   ├── api/           # API 路由
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务逻辑服务
│   │   └── main.py        # 应用入口
│   └── requirements-backend.txt  # 后端依赖
├── frontend/              # 前端代码
│   ├── src/              # React 源代码
│   │   ├── api/          # API 调用
│   │   ├── components/   # React 组件
│   │   ├── types/        # TypeScript 类型
│   │   └── App.tsx       # 主组件
│   └── package.json      # 前端依赖配置
├── scripts/              # 脚本文件
│   └── health_check.py   # 系统健康检查脚本
├── tests/                # 测试文件
├── utils/                # 工具函数
├── data/                 # 数据文件
├── requirements.txt      # 根目录依赖
└── README.md             # 项目说明
```

## 环境配置指南

### 前置要求

在开始之前，请确保您的系统已安装以下软件：

- **Python 3.8+**：用于运行后端服务
- **Node.js 16+**：用于运行前端服务
- **npm** 或 **yarn**：用于管理前端依赖

### 一键安装（推荐）

项目提供了一键安装脚本，可以自动安装所有依赖。

#### Windows 系统

```bash
# 在项目根目录下执行
setup.bat
```

安装脚本会自动执行以下操作：
1. 检查 Python 和 Node.js 环境
2. 安装后端 Python 依赖
3. 安装前端 npm 包

### 手动安装

如果一键安装脚本无法正常工作，您可以按照以下步骤手动安装：

#### 后端环境配置

1. **创建虚拟环境（可选但推荐）**

```bash
# 在项目根目录下
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r backend/requirements-backend.txt
```

2. **安装后端依赖**

```bash
# 安装后端核心依赖
pip install -r backend/requirements-backend.txt

# 安装根目录依赖（如需要）
pip install -r requirements.txt
```

#### 前端环境配置

1. **进入前端目录**

```bash
cd frontend
```

2. **安装前端依赖**

```bash
npm install
# 或使用 yarn
yarn install
```

## 如何运行项目

### 启动后端服务

```bash
# 进入后端目录
cd backend

# 启动 FastAPI 服务（开发模式）
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 或使用 Python 模块方式
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

服务启动后，访问以下地址：
- **API 文档**：http://127.0.0.1:8000/docs
- **健康检查**：http://127.0.0.1:8000/health

### 启动前端服务

```bash
# 进入前端目录
cd frontend

# 启动开发服务器
npm run dev

# 或使用 yarn
yarn dev
```

服务启动后，访问：http://127.0.0.1:3000

### 构建生产版本

```bash
# 进入前端目录
cd frontend

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 健康检查脚本

项目提供了 `health_check.py` 脚本，用于监控系统运行状态。脚本会检查：

1. **后端 FastAPI 服务状态** - 检查 `/health` 端点
2. **前端 Vite 服务状态** - 检查端口 3000 是否监听
3. **httpx 依赖安装状态** - 检查核心依赖是否安装
4. **自动修复功能** - 如果后端服务未运行，可尝试自动启动

### 运行健康检查

#### 方式一：使用 npm 脚本（推荐）

```bash
# 进入前端目录
cd frontend

# 运行健康检查
npm run health
```

#### 方式二：直接运行 Python 脚本

```bash
# 在项目根目录下
python scripts/health_check.py

# 或使用相对路径
python ./scripts/health_check.py
```

#### 方式三：指定参数运行

```bash
# 禁用自动修复功能
python scripts/health_check.py --no-fix

# 使用文本格式输出（默认为 JSON）
python scripts/health_check.py --output text
```

### 健康检查脚本参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--no-fix` | 不尝试自动修复（如启动后端服务） | 禁用 |
| `--output` | 输出格式，可选 `json` 或 `text` | `json` |

### 健康检查返回状态说明

- **UP**：所有检查项正常
- **DEGRADED**：部分检查项失败，但核心功能可用
- **DOWN**：关键检查项失败，系统无法正常工作

## 运行测试

### 前端测试

```bash
# 进入前端目录
cd frontend

# 运行测试（监视模式）
npm run test

# 运行测试（单次执行）
npm run test:run
```

### 后端测试

```bash
# 运行 pytest 测试
pytest tests/

# 或在根目录运行
python -m pytest tests/
```

## API 接口示例

### 健康检查接口

**请求**：
```http
GET /health
```

**响应**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 旅游趋势接口

**请求**：
```http
GET /api/trends
```

**响应**：
```json
{
  "trends": [
    {
      "destination": "北京",
      "popularity": 95,
      "trend": "up"
    }
  ]
}
```

### 行程规划接口

**请求**：
```http
POST /api/itinerary
Content-Type: application/json

{
  "destination": "北京",
  "days": 3,
  "budget": 5000
}
```

## 常见问题

### Q: 后端服务无法启动？

A: 请检查以下几点：
1. 确保 Python 版本 >= 3.8
2. 确保所有依赖已正确安装
3. 检查端口 8000 是否被占用
4. 运行健康检查脚本获取详细错误信息

### Q: 前端无法连接后端？

A: 请检查：
1. 后端服务是否已启动
2. 后端服务是否监听在正确的地址和端口
3. 检查浏览器控制台是否有跨域错误

### Q: 如何修改默认端口？

A: 
- **后端**：修改 `uvicorn` 命令的 `--port` 参数
- **前端**：修改 `vite.config.ts` 配置文件

## 贡献指南

1. Fork 项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件

---

**注意**：本项目仅供学习和研究使用，请勿用于商业用途。
