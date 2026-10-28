# FOJ 在线判题系统 · 前端

FOJ 在线判题系统的 Web 前端，基于 Vue3 + TypeScript + Arco Design，
支持题目浏览、在线代码编辑与提交、判题结果实时轮询展示。

> 后端微服务仓库：[foj-backend-microservice](https://github.com/🔲你的用户名/foj-backend-microservice)

## 功能

- 用户注册 / 登录（Session 会话）
- 题目列表 / 题目详情（题面、输入输出样例、限制）
- 在线做题页：Monaco Editor 代码编辑、语言选择、一键提交
- 提交后每 500ms 轮询判题状态，终态展示 通过/未通过、耗时与内存
- 管理端：题目创建/管理（含判题用例与判题配置表单）

## 技术栈

Vue3 · TypeScript · Arco Design Vue · Monaco Editor · Axios · Vue Router · Pinia

## 与后端联动

- 所有请求经后端网关统一转发（baseURL 指向 🔲http://localhost:8121/api）
- 后端已配置 Jackson 全局 Long → String 序列化，
  避免雪花 ID 超出 JS Number 安全整数导致的精度丢失

## 快速启动

```bash
npm install
npm run serve     # 开发模式
# 或
npm run build     # 生产构建
```

> 需先启动后端各服务，见主仓库 README 的「快速启动」。
