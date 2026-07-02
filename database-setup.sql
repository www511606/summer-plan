# 暑假学习计划 - 数据库初始化 SQL

# 请在 Supabase 后台执行以下 SQL 语句
# 打开 https://app.supabase.com -> 选择你的项目 -> SQL Editor -> 粘贴执行

-- 1. 用户档案表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'child', -- 'child' 或 'parent'
  child_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 计划模板表（家长创建的计划规则）
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT 'other', -- chinese/math/english/calligraphy/reading/exercise/other
  deadline TEXT DEFAULT '', -- 如 "09:00"
  plan_type TEXT NOT NULL DEFAULT 'daily', -- daily/weekly/one_time
  requires_photo BOOLEAN DEFAULT FALSE,
  week_days INTEGER[] DEFAULT '{}', -- [1,2,3,4,5] 周一到周五
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 每日任务表（具体的执行任务）
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'other',
  due_date DATE NOT NULL,
  deadline TEXT DEFAULT '',
  requires_photo BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/submitted/completed/returned
  photo_url TEXT DEFAULT '',
  return_reason TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 批注/评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 积分表
CREATE TABLE IF NOT EXISTS points (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  total_points INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 积分变动日志
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 奖励设置表
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 兑换记录表
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  reward_id UUID REFERENCES rewards(id),
  reward_name TEXT NOT NULL,
  cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 安全策略 (RLS) ====================

-- 启用行级安全
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- profiles: 每个人只能看自己的
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- plans: 家长可以看自己的计划
CREATE POLICY "Users can view own plans" ON plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own plans" ON plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON plans FOR DELETE USING (auth.uid() = user_id);

-- tasks: 用户只能看自己的任务
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);

-- comments: 用户可以查看和创建批注
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.user_id = auth.uid())
);

-- points: 用户只能看自己的积分
CREATE POLICY "Users can view own points" ON points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON points FOR UPDATE USING (auth.uid() = user_id);

-- point_logs: 用户只能看自己的日志
CREATE POLICY "Users can view own logs" ON point_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create logs" ON point_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- rewards: 只有家长可以管理奖励
CREATE POLICY "Parents can manage rewards" ON rewards FOR ALL USING (auth.uid() = parent_id);

-- redemptions: 用户只能看自己的兑换记录
CREATE POLICY "Users can view own redemptions" ON redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create redemptions" ON redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================== 存储桶 ====================
-- 在 Supabase 后台 -> Storage -> 创建 bucket: task.photos
-- 设置为 Public（公开读取）

-- task.photos 存储策略
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'task.photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task.photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'task.photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==================== 触发器 ====================

-- 新用户自动创建档案
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 使用 SECURITY INVOKER 让触发器在 RLS 策略下运行，但插入 profiles 时需要绕过
  -- 改用 SECURITY DEFINER 以 postgres 权限插入，绕过 RLS
  INSERT INTO public.profiles (id, nickname, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'child')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
