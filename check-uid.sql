-- 检查当前登录的家长账号 ID 和 family_members 里的 parent_id 是否匹配
SELECT au.email, au.id as auth_uid, p.nickname, p.role
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE au.email IN ('wang@qq.com', 'zb@qq.com');

-- 检查 family_members 表里的 parent_id
SELECT fm.*, p.nickname as parent_nickname
FROM family_members fm
JOIN profiles p ON p.id = fm.parent_id;
