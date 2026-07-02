-- ============================================
-- Summer Plan 完整修复 SQL
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 创建家庭关系表（替代不可靠的 child_name 字符串匹配）
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  child_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- 2. 为家庭关系表启用 RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 3. 家庭关系表的 RLS
-- 家长可以看到自己关联的所有孩子
CREATE POLICY "Parents can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

-- 家长可以添加孩子到自己家庭
CREATE POLICY "Parents can add family members" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

-- 家长可以移除孩子
CREATE POLICY "Parents can remove family members" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

-- 4. 删除旧的 plans 策略
DROP POLICY IF EXISTS "Users can view own plans" ON plans;
DROP POLICY IF EXISTS "Users can update own plans" ON plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON plans;
DROP POLICY IF EXISTS "Users can create own plans" ON plans;

-- 5. 新的 plans 策略：家长可以管理自己和孩子计划
CREATE POLICY "Users can view own plans" ON plans FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN profiles cp ON cp.id = fm.child_id
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

CREATE POLICY "Users can update own plans" ON plans FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN profiles cp ON cp.id = fm.child_id
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

CREATE POLICY "Users can delete own plans" ON plans FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN profiles cp ON cp.id = fm.child_id
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

CREATE POLICY "Users can create own plans" ON plans FOR INSERT WITH CHECK
  (auth.uid() = user_id);

-- 6. 删除旧的 tasks 策略
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;

-- 7. 新的 tasks 策略
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

CREATE POLICY "Users can create own tasks" ON tasks FOR INSERT WITH CHECK
  (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

-- 8. 删除旧的 comments 策略
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;

-- 9. 新的 comments 策略
CREATE POLICY "Users can view comments" ON comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN family_members fm ON fm.child_id = t.user_id
      WHERE t.id = comments.task_id AND fm.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK
  (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN family_members fm ON fm.child_id = t.user_id
      WHERE t.id = comments.task_id AND fm.parent_id = auth.uid()
    )
  );

-- 10. 新增：家长绑定孩子的辅助页面用表
-- 家长在这里输入孩子的邮箱/昵称来绑定
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  child_email TEXT NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage invites" ON family_invites FOR ALL
  USING (auth.uid() = parent_id);
