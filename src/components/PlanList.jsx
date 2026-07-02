import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle2, Circle, Camera, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Trash2, Users, UserPlus, X } from 'lucide-react'
import { supabase, TASK_STATUSES, PLAN_TYPES, DAYS_OF_WEEK, SUBJECTS } from '../lib/constants'
import { getTasksByDate, getAllChildrenTasksByDate, getChildTasksByDate, updateTask, deleteTask, createTask, uploadPhoto, addPoints, getComments, addComment } from '../lib/db'

export default function PlanList() {
  const [tasks, setTasks] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [showReturnModal, setShowReturnModal] = useState(false)

  // 家长相关状态
  const [children, setChildren] = useState([]) // 绑定的孩子列表
  const [selectedChildId, setSelectedChildId] = useState(null) // 当前选择查看哪个孩子
  const [showFamilyPanel, setShowFamilyPanel] = useState(false) // 是否显示家庭管理面板
  const [childEmail, setChildEmail] = useState('') // 邀请孩子用的邮箱
  const [inviteLoading, setInviteLoading] = useState(false)

  const dateStr = formatDate(currentDate)

  useEffect(() => { loadData() }, [dateStr, selectedChildId])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      if (p?.role === 'parent') {
        // 加载家长绑定的所有孩子
        const { data: famData } = await supabase
          .from('family_members')
          .select('child_id')
          .eq('parent_id', user.id)

        if (famData && famData.length > 0) {
          const childIds = famData.map(f => f.child_id)
          const { data: childProfiles } = await supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', childIds)

          setChildren(childProfiles || [])

          // 如果没有选中的孩子，默认选第一个
          if (!selectedChildId && childProfiles?.length > 0) {
            setSelectedChildId(childProfiles[0].id)
          }
        } else {
          setChildren([])
        }

        // 如果选了特定孩子，按孩子查；否则显示空
        if (selectedChildId) {
          const tasksData = await getChildTasksByDate(user.id, selectedChildId, dateStr)
          // 批量加载评论
          for (const task of tasksData) {
            const { data: comments } = await supabase
              .from('comments')
              .select('*, user:profiles!fk_comment_user(nickname, role)')
              .eq('task_id', task.id)
              .order('created_at', { ascending: true })
            task.comments = comments || []
          }
          setTasks(tasksData)
        } else {
          setTasks([])
        }
      } else {
        // 孩子只看自己的任务
        const tasksData = await getTasksByDate(user.id, dateStr)
        // 批量加载评论
        for (const task of tasksData) {
          const { data: comments } = await supabase
            .from('comments')
            .select('*, user:profiles!fk_comment_user(nickname, role)')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true })
          task.comments = comments || []
        }
        setTasks(tasksData)
      }
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 邀请孩子加入家庭
  async function handleInviteChild() {
    if (!childEmail.trim()) return
    setInviteLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 查找邮箱对应的用户
      const { data: childUser, error: searchErr } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('id', childEmail) // 这里需要先找到用户的 id
        .single()

      // 尝试通过 auth 查找
      const { data: authData } = await supabase.auth.admin.listUsers()
      const matchedUser = authData?.users?.find(u => u.email?.toLowerCase() === childEmail.toLowerCase())

      if (!matchedUser) {
        alert('找不到该邮箱的用户，请确认孩子已注册')
        return
      }

      // 检查是否已经绑定
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('parent_id', user.id)
        .eq('child_id', matchedUser.id)
        .single()

      if (existing) {
        alert('该孩子已经在你家里了')
        return
      }

      // 添加绑定关系
      const { error: insertErr } = await supabase
        .from('family_members')
        .insert([{ parent_id: user.id, child_id: matchedUser.id }])

      if (insertErr) throw insertErr

      alert('✅ 绑定成功！')
      setChildEmail('')
      setShowFamilyPanel(false)
      loadData()
    } catch (err) {
      alert('邀请失败: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  // 解除绑定
  async function handleUnbindChild(childId) {
    if (!confirm('确定要解除与这个孩子的绑定吗？')) return
    const { data: { user } } = await supabase.auth.getUser()
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('parent_id', user.id)
        .eq('child_id', childId)

      if (error) throw error

      if (selectedChildId === childId) {
        setSelectedChildId(null)
      }
      loadData()
    } catch (err) {
      alert('解绑失败: ' + err.message)
    }
  }

  // 删除任务
  async function handleDeleteTask(taskId, e) {
    e.stopPropagation()
    if (!confirm('确定要删除这个任务吗？')) return
    try {
      await deleteTask(taskId)
      loadData()
      if (selectedTask?.id === taskId) setSelectedTask(null)
    } catch (err) {
      alert('删除失败: ' + err.message)
    }
  }

  function formatDate(date) { return date.toISOString().split('T')[0] }

  function getDisplayDate(date) {
    const d = new Date(date)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    if (d.getTime() === today.getTime()) return '今天'
    if (d.getTime() === tomorrow.getTime()) return '明天'
    return `${d.getMonth() + 1}月${d.getDate()}日 ${DAYS_OF_WEEK[d.getDay()]}`
  }

  function changeDate(days) {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + days)
    setCurrentDate(newDate)
  }

  function getStatusStyle(status) {
    const map = {
      [TASK_STATUSES.COMPLETED]: { bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
      [TASK_STATUSES.SUBMITTED]: { bg: '#fef9c3', text: '#a16207', border: '#fde047', icon: <AlertCircle className="w-5 h-5 text-yellow-500" /> },
      [TASK_STATUSES.RETURNED]: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', icon: <RefreshCw className="w-5 h-5 text-red-500" /> },
      default: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', icon: <Circle className="w-5 h-5 text-gray-300" /> },
    }
    return map[status] || map.default
  }

  function getStatusLabel(status) {
    return {
      [TASK_STATUSES.COMPLETED]: '已完成',
      [TASK_STATUSES.SUBMITTED]: '已提交',
      [TASK_STATUSES.RETURNED]: '需重做',
      default: '待完成',
    }[status] || '待完成'
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const url = await uploadPhoto(file, selectedTask.id)
      await updateTask(selectedTask.id, { photo_url: url, status: TASK_STATUSES.SUBMITTED })
      setSelectedTask(prev => ({ ...prev, photo_url: url, status: TASK_STATUSES.SUBMITTED }))
      loadData()
    } catch (err) { alert('上传失败: ' + err.message) }
  }

  async function handleSubmit() {
    if (!selectedTask) return
    setSubmitLoading(true)
    try {
      await updateTask(selectedTask.id, { status: TASK_STATUSES.SUBMITTED })
      setSelectedTask(prev => ({ ...prev, status: TASK_STATUSES.SUBMITTED }))
      loadData()
    } catch (err) { alert('提交失败: ' + err.message) }
    finally { setSubmitLoading(false) }
  }

  async function handleReturn() {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, { status: TASK_STATUSES.RETURNED, return_reason: returnReason })
      setSelectedTask(prev => ({ ...prev, status: TASK_STATUSES.RETURNED, return_reason: returnReason }))
      setShowReturnModal(false); setReturnReason('')
      loadData()
    } catch (err) { alert('操作失败: ' + err.message) }
  }

  async function handleAddComment() {
    if (!selectedTask || !commentText.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    try {
      await addComment({ task_id: selectedTask.id, user_id: user.id, content: commentText })
      setCommentText('')
      loadData()
    } catch (err) { alert('发送失败: ' + err.message) }
  }

  async function handleResubmit() {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, { status: TASK_STATUSES.PENDING })
      loadData()
    } catch (err) { alert('操作失败: ' + err.message) }
  }

  async function handleComplete() {
    // 孩子直接勾选完成，立即生效 + 加分
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, { status: TASK_STATUSES.COMPLETED })
      await addPoints(selectedTask.user_id, 10, `完成任务：${selectedTask.title}`)
      setSelectedTask(prev => ({ ...prev, status: TASK_STATUSES.COMPLETED }))
      loadData()
    } catch (err) { alert('操作失败: ' + err.message) }
  }

  const completedCount = tasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // 家长选择孩子时的标签
  const selectedChildName = children.find(c => c.id === selectedChildId)?.nickname || ''

  return (
    <div className="fade-in-up">
      {/* 家长选择孩子的面板 */}
      {profile?.role === 'parent' && (
        <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: '#ffffff' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: '#f97316' }} />
              <span className="font-medium" style={{ color: '#1e293b' }}>选择孩子</span>
            </div>
            <button
              onClick={() => setShowFamilyPanel(!showFamilyPanel)}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#64748b' }}
            >
              <UserPlus className="w-4 h-4" />
              {showFamilyPanel ? '收起' : '绑定孩子'}
            </button>
          </div>

          {/* 孩子选择按钮 */}
          {children.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => { setSelectedChildId(child.id); setSelectedTask(null) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${selectedChildId === child.id ? 'border-orange-400' : 'border-gray-200 hover:border-gray-300'}`}
                  style={selectedChildId === child.id ? { background: '#fff7ed' } : { background: '#fff' }}
                >
                  {child.nickname}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnbindChild(child.id) }}
                    className="p-0.5 rounded-full hover:bg-red-100 transition-colors"
                    style={{ color: '#94a3b8' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              还没有绑定孩子，点击上方"绑定孩子"添加
            </p>
          )}

          {/* 家庭管理面板 */}
          {showFamilyPanel && (
            <div className="mt-3 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>邀请孩子加入</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={childEmail}
                  onChange={(e) => setChildEmail(e.target.value)}
                  placeholder="输入孩子的注册邮箱"
                  className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-orange-200"
                  style={{ borderColor: '#e5e7eb' }}
                />
                <button
                  onClick={handleInviteChild}
                  disabled={inviteLoading || !childEmail.trim()}
                  className="px-4 py-2 rounded-xl text-sm text-white font-medium disabled:opacity-50"
                  style={{ background: '#f97316' }}
                >
                  {inviteLoading ? '邀请中...' : '邀请'}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
                孩子需要先注册账号，然后用孩子的邮箱邀请绑定
              </p>
            </div>
          )}
        </div>
      )}

      {/* 日期导航 */}
      <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ background: '#ffffff' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#64748b' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold" style={{ color: '#1e293b' }}>{getDisplayDate(currentDate)}</h2>
            {profile?.role === 'parent' && selectedChildName && (
              <p className="text-xs mt-0.5" style={{ color: '#f97316' }}>正在查看：{selectedChildName} 的任务</p>
            )}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#64748b' }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {totalCount > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1.5" style={{ color: '#64748b' }}>
              <span>今日进度</span>
              <span>{completedCount}/{totalCount} · {progressPercent}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: '#f1f5f9' }}>
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #f97316, #ec4899)' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#94a3b8' }}>加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <p className="mb-4" style={{ color: '#64748b' }}>
            {profile?.role === 'parent' && !selectedChildId
              ? '请先选择一个孩子查看任务'
              : profile?.role === 'parent'
              ? '今天还没有计划哦'
              : '今天还没有任务'}
          </p>
          {profile?.role === 'child' && (
            <Link to="/plan/create" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <Plus className="w-5 h-5" />创建计划
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const st = getStatusStyle(task.status)
            const isSelected = selectedTask?.id === task.id
            return (
              <div
                key={task.id}
                className="rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                style={{ background: '#ffffff', borderLeft: `4px solid ${st.border}` }}
              >
                <div className="p-4" onClick={() => setSelectedTask(isSelected ? null : task)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{st.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium" style={{
                          textDecoration: task.status === TASK_STATUSES.COMPLETED ? 'line-through' : 'none',
                          color: task.status === TASK_STATUSES.COMPLETED ? '#94a3b8' : '#1e293b',
                        }}>{task.title}</h3>
                        {task.plan?.subject && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{
                            backgroundColor: SUBJECTS.find(s => s.value === task.plan.subject)?.color || '#64748b'
                          }}>
                            {SUBJECTS.find(s => s.value === task.plan.subject)?.label || task.plan.subject}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: '#94a3b8' }}>
                        {task.deadline && (
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.deadline}前完成</span>
                        )}
                        {task.requires_photo && (
                          <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" />需拍照</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.text }}>
                      {getStatusLabel(task.status)}
                    </span>
                    {/* 删除按钮 - 仅家长可见 */}
                    {profile?.role === 'parent' && (
                      <button
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: '#94a3b8' }}
                        title="删除任务"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 展开详情 */}
                {isSelected && (
                  <div className="px-4 pb-4 border-t fade-in" style={{ borderColor: '#f1f5f9' }}>
                    <div className="pt-3 space-y-3">
                      {task.plan?.description && (
                        <p className="text-sm p-3 rounded-xl" style={{ background: '#f8fafc', color: '#475569' }}>{task.plan.description}</p>
                      )}
                      {task.photo_url && (
                        <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e2e8f0' }}>
                          <img src={task.photo_url} alt="提交的照片" className="w-full h-auto max-h-80 object-contain" style={{ background: '#f8fafc' }} />
                        </div>
                      )}
                      {task.return_reason && (
                        <div className="rounded-xl p-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                          <p className="text-sm font-medium mb-1" style={{ color: '#dc2626' }}>需要重做：</p>
                          <p className="text-sm" style={{ color: '#991b1b' }}>{task.return_reason}</p>
                        </div>
                      )}

                      {/* 批注 */}
                      {task.comments && task.comments.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>💬 批注</p>
                          {task.comments.map((c) => (
                            <div key={c.id} className="p-3 rounded-xl mb-2" style={{
                              background: c.user?.role === 'parent' ? '#eff6ff' : '#f0fdf4',
                              border: `1px solid ${c.user?.role === 'parent' ? '#bfdbfe' : '#bbf7d0'}`,
                            }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">{c.user?.nickname || '未知'}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                  background: c.user?.role === 'parent' ? '#dbeafe' : '#dcfce7',
                                  color: c.user?.role === 'parent' ? '#1d4ed8' : '#15803d',
                                }}>{c.user?.role === 'parent' ? '家长' : '孩子'}</span>
                                <span className="text-xs ml-auto" style={{ color: '#94a3b8' }}>
                                  {new Date(c.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: '#374151' }}>{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 批注输入 - 家长 */}
                      {profile?.role === 'parent' && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="写下你的批注..."
                            className="flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                            style={{ borderColor: '#e5e7eb' }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
                          />
                          <button onClick={handleAddComment} className="px-4 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: '#f97316' }}>发送</button>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex gap-2 flex-wrap pt-1">
                        {/* 孩子：待完成时可直接标记完成 */}
                        {task.status === TASK_STATUSES.PENDING && profile?.role === 'child' && (
                          task.requires_photo ? (
                            <label className="flex-1 px-4 py-3 rounded-xl text-sm text-white font-medium text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]" style={{ background: '#f97316' }}>
                              <Camera className="w-4 h-4 inline mr-1" />拍照上传
                              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                          ) : (
                            <button onClick={handleComplete} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: '#22c55e' }}>
                              ✅ 标记完成 (+10⭐)
                            </button>
                          )
                        )}

                        {/* 孩子：待完成时也可以直接提交（不需要拍照的情况） */}
                        {task.status === TASK_STATUSES.PENDING && profile?.role === 'child' && !task.requires_photo && (
                          <button onClick={handleSubmit} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: '#3b82f6' }}>
                            📤 提交任务
                          </button>
                        )}

                        {/* 孩子：需要拍照时显示提交按钮 */}
                        {task.status === TASK_STATUSES.PENDING && profile?.role === 'child' && task.requires_photo && (
                          <button onClick={handleSubmit} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: '#3b82f6' }}>
                            📤 提交任务
                          </button>
                        )}

                        {/* 家长：看到已提交的可以打回 */}
                        {task.status === TASK_STATUSES.SUBMITTED && profile?.role === 'parent' && (
                          <button onClick={() => setShowReturnModal(true)} className="flex-1 px-4 py-3 rounded-xl text-sm text-white font-medium" style={{ background: '#ef4444' }}>
                            🔙 打回重做
                          </button>
                        )}

                        {/* 所有人都可以看到提交状态 */}
                        {task.status === TASK_STATUSES.SUBMITTED && (
                          <span className="flex-1 px-4 py-3 rounded-xl text-sm text-center" style={{ background: '#fef9c3', color: '#a16207' }}>
                            ✔ 已完成提交
                          </span>
                        )}

                        {/* 家长：看到已完成的任务 */}
                        {task.status === TASK_STATUSES.COMPLETED && profile?.role === 'parent' && (
                          <span className="flex-1 px-4 py-3 rounded-xl text-sm text-center" style={{ background: '#dcfce7', color: '#15803d' }}>
                            ✅ 已完成
                          </span>
                        )}

                        {/* 孩子：被退回后可以重新提交 */}
                        {task.status === TASK_STATUSES.RETURNED && profile?.role === 'child' && (
                          <button onClick={handleResubmit} className="flex-1 px-4 py-3 rounded-xl text-sm text-white font-medium" style={{ background: '#f97316' }}>
                            🔄 修改后重新提交
                          </button>
                        )}

                        {/* 家长：看到被退回的可以再次打回 */}
                        {task.status === TASK_STATUSES.RETURNED && profile?.role === 'parent' && (
                          <span className="flex-1 px-4 py-3 rounded-xl text-sm text-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            🔙 需要重做
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 打回弹窗 */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => { setShowReturnModal(false); setReturnReason('') }}>
          <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 slide-up md:scale-in" style={{ background: '#ffffff' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1e293b' }}>确认打回？</h3>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="请说明需要修改的地方..."
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none h-24 mb-4 focus:ring-2 focus:ring-orange-200"
              style={{ borderColor: '#e5e7eb' }}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowReturnModal(false); setReturnReason('') }} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>取消</button>
              <button onClick={handleReturn} className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: '#ef4444' }}>确认打回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
