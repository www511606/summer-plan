-- 检查所有用户的身份
SELECT id, nickname, role, child_name
FROM profiles
ORDER BY created_at DESC;
