-- ============================================
-- Summer Plan: 修复家长看不到孩子列表的问题
-- 幂等版本：可以反复执行，不会报错
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- ----------------------------
-- 1. 创建 family_members 表（如果不存在）
-- ----------------------------
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) NOT NULL,
  child_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- ----------------------------
-- 2. 给 family_members 表启用 RLS
-- ----------------------------
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- ----------------------------
-- 3. 清理所有可能冲突的策略（全部 DROP）
-- ----------------------------
-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own and children profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- family_members
DROP POLICY IF EXISTS "Parents can view family members" ON family_members;
DROP POLICY IF EXISTS "Parents can add family members" ON family_members;
DROP POLICY IF EXISTS "Parents can remove family members" ON family_members;

-- plans
DROP POLICY IF EXISTS "Users can view own plans" ON plans;
DROP POLICY IF EXISTS "Users can view own and children plans" ON plans;
DROP POLICY IF EXISTS "Users can create own plans" ON plans;
DROP POLICY IF EXISTS "Users can update own plans" ON plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON plans;
DROP POLICY IF EXISTS "Parents can view children plans" ON plans;
DROP POLICY IF EXISTS "Parents can update children plans" ON plans;
DROP POLICY IF EXISTS "Parents can delete children plans" ON plans;

-- tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own and children tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Parents can view children tasks" ON tasks;

-- comments
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can view own and children comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Parents can view children comments" ON comments;

-- ----------------------------
-- 4. 创建新的 RLS 策略
-- ----------------------------

-- 4a. family_members: 家长可以管理家庭成员
CREATE POLICY "Parents can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

CREATE POLICY "Parents can add family members" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

CREATE POLICY "Parents can remove family members" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

-- 4b. profiles: 每个人可以看自己，家长可以看所有孩子
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4c. plans: 家长可以看自己和孩子创建的计划
CREATE POLICY "Users can view plans" ON plans
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

CREATE POLICY "Users can create plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update plans" ON plans
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

CREATE POLICY "Users can delete plans" ON plans
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

-- 4d. tasks: 家长可以看自己孩子的任务
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

CREATE POLICY "Users can delete tasks" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

-- 4e. comments: 家长可以看孩子任务的批注
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN family_members fm ON fm.child_id = t.user_id
      WHERE t.id = comments.task_id AND fm.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN family_members fm ON fm.child_id = t.user_id
      WHERE t.id = comments.task_id AND fm.parent_id = auth.uid()
    )
  );

-- ----------------------------
-- 5. 确认绑定关系（如果不存在则插入）
-- ----------------------------
INSERT INTO family_members (parent_id, child_id)
VALUES (
  'd0e9167e-41a7-4701-a8b0-61c813a28ead',
  '513f3419-0062-454c-aae6-7ff6d97e625d'
)
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- ----------------------------
-- 6. 验证查询（执行后可看到结果）
-- ----------------------------
-- 查看绑定关系
SELECT fm.*, p_parent.nickname as parent_nickname, p_child.nickname as child_nickname
FROM family_members fm
JOIN profiles p_parent ON p_parent.id = fm.parent_id
JOIN profiles p_child ON p_child.id = fm.child_id;

-- 查看家长能看到的任务
SELECT t.*, p.title as plan_title, pr.nickname as child_nickname
FROM tasks t
JOIN plans p ON p.id = t.plan_id
JOIN profiles pr ON pr.id = t.user_id
WHERE t.user_id IN (
  SELECT child_id FROM family_members WHERE parent_id = 'd0e9167e-41a7-4701-a8b0-61c813a28ead'
);
