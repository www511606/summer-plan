-- 修复家长看不到孩子任务的 RLS 策略
-- 在 Supabase SQL Editor 中执行

-- 1. 删除旧的 plans 策略（只允许看自己的）
DROP POLICY IF EXISTS "Users can view own plans" ON plans;

-- 2. 新策略：家长可以查看自己孩子的计划
-- 通过 profiles.child_name 关联：家长的 child_name = 孩子的 nickname
CREATE POLICY "Parents can view children plans" ON plans
  FOR SELECT
  USING (
    -- 家长可以查看自己的计划
    auth.uid() = user_id
    OR
    -- 家长也可以查看自己孩子的计划（通过 child_name 匹配）
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
        AND parent_profile.role = 'parent'
        AND parent_profile.child_name != ''
        AND EXISTS (
          SELECT 1 FROM profiles child_profile
          WHERE child_profile.id = plans.user_id
            AND child_profile.role = 'child'
            AND child_profile.nickname = parent_profile.child_name
        )
    )
  );

-- 3. 删除旧的 tasks 策略
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;

-- 4. 新策略：家长可以查看自己孩子的任务
CREATE POLICY "Parents can view children tasks" ON tasks
  FOR SELECT
  USING (
    -- 用户查看自己的任务
    auth.uid() = user_id
    OR
    -- 家长查看自己孩子的任务
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
        AND parent_profile.role = 'parent'
        AND parent_profile.child_name != ''
        AND EXISTS (
          SELECT 1 FROM profiles child_profile
          WHERE child_profile.id = tasks.user_id
            AND child_profile.role = 'child'
            AND child_profile.nickname = parent_profile.child_name
        )
    )
  );

-- 5. 删除旧的 comments 策略
DROP POLICY IF EXISTS "Users can view comments" ON comments;

-- 6. 新策略：家长可以查看自己孩子任务的批注
CREATE POLICY "Parents can view children comments" ON comments
  FOR SELECT
  USING (
    -- 查看自己任务的批注
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.user_id = auth.uid())
    OR
    -- 家长查看自己孩子任务的批注
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
        AND parent_profile.role = 'parent'
        AND parent_profile.child_name != ''
        AND EXISTS (
          SELECT 1 FROM tasks
          JOIN profiles child_profile ON child_profile.id = tasks.user_id
          WHERE tasks.id = comments.task_id
            AND child_profile.role = 'child'
            AND child_profile.nickname = parent_profile.child_name
        )
    )
  );

-- 7. 同样放宽 plans 的 UPDATE/DELETE 策略，允许家长管理孩子的计划
DROP POLICY IF EXISTS "Users can update own plans" ON plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON plans;

CREATE POLICY "Parents can update children plans" ON plans
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
        AND parent_profile.role = 'parent'
        AND parent_profile.child_name != ''
        AND EXISTS (
          SELECT 1 FROM profiles child_profile
          WHERE child_profile.id = plans.user_id
            AND child_profile.role = 'child'
            AND child_profile.nickname = parent_profile.child_name
        )
    )
  );

CREATE POLICY "Parents can delete children plans" ON plans
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
        AND parent_profile.role = 'parent'
        AND parent_profile.child_name != ''
        AND EXISTS (
          SELECT 1 FROM profiles child_profile
          WHERE child_profile.id = plans.user_id
            AND child_profile.role = 'child'
            AND child_profile.nickname = parent_profile.child_name
        )
    )
  );
