# Summer Plan 项目文档

## 项目概述
暑假学习计划 Web 应用，家长创建任务，孩子执行任务，支持拍照提交和积分奖励。

## 技术栈
- 前端：React + Vite + TailwindCSS
- 后端/数据库：Supabase（PostgreSQL + Auth + Storage）
- 部署：Netlify

## 数据库结构

### 表结构
| 表名 | 说明 |
|------|------|
| profiles | 用户档案（id, nickname, role, child_name） |
| plans | 计划模板（家长创建的学习计划） |
| tasks | 具体任务（关联 plans 和 users） |
| comments | 批注/评论 |
| points | 积分 |
| point_logs | 积分变动日志 |
| rewards | 奖励设置 |
| redemptions | 兑换记录 |
| family_members | 家庭关系（parent_id → child_id） |

### 关键关系
- 家长通过 `family_members` 表绑定孩子
- 任务（tasks）关联孩子（user_id = 孩子ID）
- 计划（plans）关联家长（user_id = 家长ID）

## 绑定状态（已确认）
- 家长 ID: `d0e9167e-41a7-4701-a8b0-61c813a28ead`（昵称"王"）
- 孩子 ID: `513f3419-0062-454c-aae6-7ff6d97e625d`（昵称"钟歆妤"）
- family_members 表已有绑定记录

## 已修复问题

### 问题 1：家长登录后看不到孩子列表 ✅ 已修复

**根本原因**：`profiles` 表的 RLS 策略过于严格，只允许用户查看自己的资料：
```sql
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
```

在 PlanList.jsx 的 `loadData()` 中，家长需要先查 `family_members` 拿到 child_id，再用 `profiles` 表查孩子昵称。但因为 RLS 策略限制了 `profiles` 表的 SELECT，所以即使 `family_members` 查到了 child_id，`profiles` 查询也会返回空数组。

**修复方案**：
1. **SQL 修复**（执行 `fix-profile-rls.sql`）：
   - 放宽 `profiles` 表 RLS：允许家长查看所有 role='child' 的资料
   - 放宽 `tasks` 表 RLS：允许家长查看绑定孩子的任务
   - 放宽 `plans` 表 RLS：允许家长查看绑定孩子的计划
   - 放宽 `comments` 表 RLS：允许家长查看孩子任务的批注

2. **代码修复**（PlanList.jsx）：
   - 将 `loadData()` 中的 `selectedChildId` 闭包问题修复：不再依赖异步 state 更新，而是用 `finalChildId` 变量在同一轮函数内完成选择
   - 添加 console.log 调试日志，方便排查问题

### 问题 2：家长看不到孩子的任务 ✅ 已修复
原因同上，`tasks` 表 RLS 策略限制后一并修复。

## 待修复清单
1. [ ] 部署修复后的 SQL 到 Supabase
2. [ ] 部署修复后的前端代码到 Netlify
3. [ ] 验证孩子能否看到家长创建的任务
4. [ ] 验证孩子能否点击完成按钮

## 部署信息
- 网站地址：https://comforting-lokum-6977c5.netlify.app
- Supabase 项目：https://app.supabase.com/project/kdyjnwthtxpanlqlypec
- GitHub 仓库：https://github.com/www511606/summer-plan
