/**
 * 统一的 Supabase 数据操作层
 * 所有数据库交互都在这里封装，页面组件直接调用这些函数即可
 */
import { supabase, TASK_STATUSES, ROLES } from './constants'

// ========== 认证相关 ==========

/**
 * 注册新用户
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @param {string} role - 'child' 或 'parent'
 * @param {string} nickname - 昵称
 */
export async function signUp(email, password, role, nickname) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname: nickname,
        role: role,
      },
    },
  })
  if (error) throw error

  return data
}

/**
 * 登录
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * 登出
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 获取用户档案
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

// ========== 计划相关 ==========

/**
 * 获取某天的所有任务（不限用户，用于家长查看所有孩子的任务）
 * @param {string} date - 日期 YYYY-MM-DD
 */
export async function getAllTasksByDate(date) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      plan:plans(*)
    `)
    .gte('due_date', date)
    .lte('due_date', date)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 获取某天的所有任务（只查指定用户）
 * @param {string} userId - 用户ID
 * @param {string} date - 日期 YYYY-MM-DD
 */
export async function getTasksByDate(userId, date) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', userId)
    .gte('due_date', date)
    .lte('due_date', date)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 获取家长某个孩子的当日任务
 * @param {string} parentId - 家长用户ID
 * @param {string} childId - 孩子用户ID
 * @param {string} date - 日期 YYYY-MM-DD
 */
export async function getChildTasksByDate(parentId, childId, date) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', childId)
    .gte('due_date', date)
    .lte('due_date', date)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 获取家长所有孩子的任务（按孩子分组）
 * @param {string} parentId - 家长用户ID
 * @param {string} date - 日期 YYYY-MM-DD
 */
export async function getAllChildrenTasksByDate(parentId, date) {
  // 1. 先获取家长绑定的所有孩子
  const { data: families, error: famError } = await supabase
    .from('family_members')
    .select('child_id')
    .eq('parent_id', parentId)

  if (famError) throw famError
  if (!families || families.length === 0) return []

  const childIds = families.map(f => f.child_id)

  // 2. 获取这些孩子的所有任务
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      plan:plans(*)
    `)
    .in('user_id', childIds)
    .gte('due_date', date)
    .lte('due_date', date)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 删除任务
 * @param {string} taskId - 任务ID
 */
export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

/**
 * 获取本周任务
 */
export async function getWeekTasks(userId, weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', userId)
    .gte('due_date', weekStart.toISOString().split('T')[0])
    .lte('due_date', weekEnd.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 创建新任务
 */
export async function createTask(taskData) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select(`
      *,
      plan:plans(*)
    `)
    .single()

  if (error) throw error
  return data
}

/**
 * 更新任务状态
 */
export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      plan:plans(*)
    `)
    .single()

  if (error) throw error
  return data
}

/**
 * 上传图片到 Supabase Storage
 * @param {File} file - 图片文件
 * @param {string} taskId - 任务ID
 */
export async function uploadPhoto(file, taskId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${taskId}-${Date.now()}.${fileExt}`
  const filePath = `photos/${fileName}`

  const { data, error } = await supabase.storage
    .from('task.photos')
    .upload(filePath, file)

  if (error) throw error

  // 获取公开访问 URL
  const { data: urlData } = supabase.storage
    .from('task.photos')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

// ========== 批注相关 ==========

/**
 * 获取任务的批注
 */
export async function getComments(taskId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 添加批注
 */
export async function addComment(data) {
  const { data: result, error } = await supabase
    .from('comments')
    .insert([data])
    .select(`
      *,
      user:profiles!fk_comment_user(nickname, role)
    `)
    .single()

  if (error) throw error
  return result
}

// ========== 积分相关 ==========

/**
 * 获取用户积分
 */
export async function getPoints(userId) {
  const { data, error } = await supabase
    .from('points')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data || { user_id: userId, total_points: 0 }
}

/**
 * 增加积分
 */
export async function addPoints(userId, points, reason) {
  // 先获取当前积分
  const current = await getPoints(userId)
  const newTotal = (current?.total_points || 0) + points

  const { data, error } = await supabase
    .from('points')
    .upsert({
      user_id: userId,
      total_points: newTotal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error

  // 记录积分变动历史
  await supabase.from('point_logs').insert([{
    user_id: userId,
    points: points,
    reason: reason || '完成任务',
  }])

  return data
}

// ========== 家长设置 ==========

/**
 * 获取奖励设置
 */
export async function getRewards(parentId) {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 保存奖励设置
 */
export async function saveReward(data) {
  const { error } = await supabase
    .from('rewards')
    .upsert(data, { onConflict: 'id' })

  if (error) throw error
}

/**
 * 删除奖励
 */
export async function deleteReward(id) {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', id)

  if (error) throw error
}
