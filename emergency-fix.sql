-- ============================================
-- Summer Plan: 紧急修复 500 错误
-- 简化 RLS 策略，避免递归导致的 500
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 先禁用所有表的 RLS，恢复服务
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE points DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions DISABLE ROW LEVEL SECURITY;

-- 2. 重新启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 3. 创建简单的策略（不嵌套查询 profiles 表，避免 500）

-- profiles: 每个人只能看自己的（最简单最安全）
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- profiles: 只能更新自己的
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- family_members: 家长可以 CRUD
DROP POLICY IF EXISTS "Parents can view family members" ON family_members;
CREATE POLICY "Parents can view family members" ON family_members
  FOR SELECT USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can add family members" ON family_members;
CREATE POLICY "Parents can add family members" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can remove family members" ON family_members;
CREATE POLICY "Parents can remove family members" ON family_members
  FOR DELETE USING (auth.uid() = parent_id);

-- plans: 只能看自己的
DROP POLICY IF EXISTS "Users can view plans" ON plans;
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create plans" ON plans;
CREATE POLICY "Users can create plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update plans" ON plans;
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete plans" ON plans;
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE USING (auth.uid() = user_id);

-- tasks: 只能看自己的
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- comments: 只能看自己任务的评论
DROP POLICY IF EXISTS "Users can view comments" ON comments;
CREATE POLICY "Users can view own comments" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create own comments" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
  );
