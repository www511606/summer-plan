import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const ROLES = {
  CHILD: 'child',
  PARENT: 'parent',
}

export const PLAN_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  ONE_TIME: 'one_time',
}

export const TASK_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  COMPLETED: 'completed',
  RETURNED: 'returned',
}

// 科目列表
export const SUBJECTS = [
  { value: 'chinese', label: '语文', color: '#ef4444' },
  { value: 'math', label: '数学', color: '#f59e0b' },
  { value: 'english', label: '英语', color: '#3b82f6' },
  { value: 'physics', label: '物理', color: '#8b5cf6' },
  { value: 'chemistry', label: '化学', color: '#ec4899' },
  { value: 'morality', label: '道法', color: '#06b6d4' },
  { value: 'history', label: '历史', color: '#84cc16' },
  { value: 'geography', label: '地理', color: '#f97316' },
  { value: 'biology', label: '生物', color: '#14b8a6' },
  { value: 'pe', label: '体育', color: '#22c55e' },
  { value: 'other', label: '其他', color: '#64748b' },
]

export const DAYS_OF_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
