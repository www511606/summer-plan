# 📋 暑假学习计划 - 部署指南

> 这份文档专门为非技术人员编写，按照以下步骤操作即可上线使用。

---

## 第一步：创建 Supabase 项目（数据库 + 认证 + 存储）

Supabase 是一个免费的云端数据库服务，提供用户登录、数据存储、图片上传等功能。

### 1.1 注册账号
1. 打开浏览器，访问：**https://supabase.com**
2. 点击右上角 **Sign Up**，用 Google 账号或邮箱注册
3. 注册完成后进入控制台

### 1.2 创建项目
1. 点击 **New Project**
2. 填写：
   - **Name**: 随便起，比如"暑假学习计划"
   - **Database Password**: 记住这个密码（后面会用到）
   - **Region**: 选择 **Singapore**（新加坡，离中国最近，速度快）
3. 点击 **Create New Project**
4. 等待 2-3 分钟，项目创建完成

### 1.3 获取 API 信息
1. 进入项目后，点击左侧菜单的 **Settings**（齿轮图标）
2. 点击 **API**
3. 复制这两项：
   - **Project URL**（类似 `https://xxxxx.supabase.co`）
   - **anon public** 密钥（一串很长的字母数字）

### 1.4 执行数据库建表语句
1. 在左侧菜单找到并点击 **SQL Editor**
2. 点击 **New Query**
3. 打开本项目中的 **database-setup.sql** 文件
4. 把里面的全部内容复制粘贴到 SQL 编辑器中
5. 点击 **Run** 执行
6. 看到 "Success. No rows returned" 就说明建表成功了

### 1.5 创建图片存储桶
1. 在左侧菜单找到并点击 **Storage**（存储）
2. 点击 **New bucket**
3. 填写：
   - **Name**: `task.photos`
   - 勾选 **Public bucket**（公开读取，这样图片才能被看到）
4. 点击 **Create**

### 1.6 执行数据库建表语句
1. 在左侧菜单找到并点击 **SQL Editor**
2. 点击 **New Query**
3. 打开本项目中的 **database-setup.sql** 文件
4. 把里面的全部内容复制粘贴到 SQL 编辑器中
5. 点击 **Run** 执行
6. 再打开 **fix-family-rls.sql** 文件，同样复制全部内容执行
7. 看到 "Success. No rows returned" 就说明建表成功了

---

## 第二步：配置项目

### 2.1 配置 API 密钥
1. 进入 `summer-plan` 文件夹
2. 找到 `.env.example` 文件
3. 把它**重命名**为 `.env`（去掉 .example）
4. 用记事本打开 `.env` 文件，填入从 Supabase 复制的信息：

```
VITE_SUPABASE_URL=https://你的项目地址.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon密钥粘贴到这里
```

5. 保存文件

---

## 第三步：部署到网上

推荐使用 **Vercel**，完全免费。

### 3.1 注册 Vercel
1. 打开 **https://vercel.com**
2. 点击右上角 **Sign Up**，用 GitHub 或 Google 账号登录

### 3.2 一键部署（推荐）

最简单的方式：

1. 把整个 `summer-plan` 文件夹上传到 **GitHub**（创建一个新仓库）
2. 登录 Vercel，点击 **Add New... → Project**
3. 导入你的 GitHub 仓库
4. 在 **Environment Variables** 中添加两个变量：
   - `VITE_SUPABASE_URL` → 粘贴你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → 粘贴你的 anon 密钥
5. 点击 **Deploy**
6. 等待 1-2 分钟，部署完成！你会得到一个类似 `summer-plan-xxx.vercel.app` 的网址

### 3.3 本地调试

如果你想先在本地看看效果：

```bash
cd summer-plan
npm install
npm run dev
```

然后浏览器打开 `http://localhost:5173`

---

### 1.7 创建家长和孩子账号
1. 在左侧菜单找到并点击 **Authentication** → **Users**
2. 点击 **Add user** → **Add new user**
3. 填写邮箱和密码，取消勾选 **Confirm email**
4. 分别创建家长账号和孩子账号

---

## 第四步：绑定家庭关系

家长登录后，首页顶部会有"选择孩子"面板。点击"绑定孩子"按钮，输入孩子的注册邮箱，即可将孩子添加到家庭。绑定成功后，家长可以选择查看不同孩子的任务。

## 第五步：开始使用

1. 打开部署后的网址
2. 用家长账号登录，创建学习计划
3. 给孩子也注册一个账号
4. 孩子登录后查看和执行计划！

---

## 家长和孩子如何使用

### 家长操作流程：
1. 用家长账号登录
2. 点击「新建」创建学习任务（如：阅读30分钟、数学练习等）
3. 可以设置需要拍照提交的书面作业
4. 点击「奖励」设置积分兑换奖励
5. 孩子提交任务后，在计划列表中查看照片并批注
6. 不满意可以打回重做

### 孩子操作流程：
1. 用孩子账号登录
2. 每天查看今天的计划列表
3. 完成书面作业时拍照上传
4. 口头作业（如阅读、运动）直接标记完成
5. 完成任务获得积分（每完成一个 +10 积分）
6. 用积分兑换家长设置的奖励

---

## 常见问题

### Q: 手机上能访问吗？
A: 能！网站是自适应的，手机浏览器打开网址就能用，底部还有导航栏，体验像 APP 一样。

### Q: 图片上传不了怎么办？
A: 确保你在 Supabase 的 Storage 里创建了名为 `task-photos` 的公开存储桶。

### Q: 别人能看到我的数据吗？
A: 不会。每个账号只能看到自己账户下的数据，有安全策略保护。

### Q: 免费额度够吗？
A: 完全够用！Supabase 免费版支持大量数据和存储，Vercel 也对个人项目免费。

### Q: 怎么修改或删除计划？
A: 家长可以在数据库中直接管理，后续版本会添加界面操作。

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `database-setup.sql` | 数据库建表语句，在 Supabase 中执行 |
| `fix-family-rls.sql` | 家庭关系表和 RLS 策略修复，在 Supabase 中执行 |
| `.env.example` | 环境变量模板，重命名为 `.env` 后填入密钥 |
| `README.md` | 本文件，部署指南 |
| `src/components/` | 所有页面组件 |
| `src/lib/` | 工具函数和数据库操作 |
