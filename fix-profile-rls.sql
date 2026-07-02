-- ============================================
-- Summer Plan: 修复家长看不到孩子列表的问题
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
-- 2. 给 family_members 表启用 RLS 并创建策略
-- ----------------------------
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略（如果有）
DROP POLICY IF EXISTS "Parents can view family members" ON family_members;
DROP POLICY IF EXISTS "Parents can add family members" ON family_members;
DROP POLICY IF EXISTS "Parents can remove family members" ON family_members;

-- 家长可以查看自己关联的家庭成员
CREATE POLICY "Parents can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
      AND p.id = family_members.parent_id
    )
  );

-- 家长可以添加孩子到家庭
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

-- ----------------------------
-- 3. 【关键修复】放宽 profiles 表 RLS 策略
--    让家长可以查看已绑定孩子的资料
-- ----------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own and children profiles" ON profiles
  FOR SELECT USING (
    -- 每个人都可以查看自己的资料
    auth.uid() = id
    OR
    -- 家长可以查看自己绑定的孩子的资料
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = profiles.id
    )
    OR
    -- 家长也可以查看所有 role='child' 的资料（方便调试和管理）
    EXISTS (
      SELECT 1 FROM profiles parent_p
      WHERE parent_p.id = auth.uid()
        AND parent_p.role = 'parent'
    )
  );

-- ----------------------------
-- 4. 放宽 tasks 表 RLS 策略
--    让家长可以查看孩子的任务
-- ----------------------------
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;

CREATE POLICY "Users can view own and children tasks" ON tasks
  FOR SELECT USING (
    -- 查看自己的任务
    auth.uid() = user_id
    OR
    -- 家长查看自己孩子的任务
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = tasks.user_id
    )
  );

-- ----------------------------
-- 5. 放宽 plans 表 RLS 策略
--    让家长可以查看孩子的计划
-- ----------------------------
DROP POLICY IF EXISTS "Users can view own plans" ON plans;

CREATE POLICY "Users can view own and children plans" ON plans
  FOR SELECT USING (
    -- 查看自己的计划
    auth.uid() = user_id
    OR
    -- 家长查看自己孩子的计划
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.parent_id = auth.uid()
        AND fm.child_id = plans.user_id
    )
  );

-- ----------------------------
-- 6. 放宽 comments 表 RLS 策略
--    让家长可以查看孩子任务的批注
-- ----------------------------
DROP POLICY IF EXISTS "Users can view comments" ON comments;

CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (
    -- 查看自己任务的批注
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND t.user_id = auth.uid())
    OR
    -- 家长查看自己孩子任务的批注
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN family_members fm ON fm.child_id = t.user_id
      WHERE t.id = comments.task_id AND fm.parent_id = auth.uid()
    )
  );

-- ----------------------------
-- 7. 确认绑定关系（调试用）
--    家长"王"的ID: d0e9167e-41a7-4701-a8b0-61c813a28ead
--    孩子"钟歆妤"的ID: 513f3419-0062-454c-aae6-7ff6d97e625d
--    如果下面这条 INSERT 返回 "conflict" 说明已存在，忽略即可
-- ----------------------------
INSERT INTO family_members (parent_id, child_id)
VALUES (
  'd0e9167e-41a7-4701-a8b0-61c813a28ead',
  '513f3419-0062-454c-aae6-7ff6d97e625d'
)
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- ----------------------------
-- 8. 验证查询（调试用，执行后可以看到结果）
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
