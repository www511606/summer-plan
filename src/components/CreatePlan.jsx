import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { supabase, PLAN_TYPES, SUBJECTS } from '../lib/constants'
import { createTask } from '../lib/db'

export default function CreatePlan() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('other')
  const [deadline, setDeadline] = useState('')
  const [planType, setPlanType] = useState(PLAN_TYPES.DAILY)
  const [requiresPhoto, setRequiresPhoto] = useState(false)
  const [weekDays, setWeekDays] = useState([false, false, false, false, false, false, false])
  const [loading, setLoading] = useState(false)

  const templates = [
    { label: '📖 阅读', title: '阅读课外书', description: '安静阅读至少30分钟', subject: 'reading', type: PLAN_TYPES.DAILY },
    { label: '✍️ 练字', title: '练字', description: '认真练习一页硬笔书法', subject: 'calligraphy', type: PLAN_TYPES.DAILY, photo: true },
    { label: '📐 数学', title: '数学口算练习', description: '完成一页口算练习题', subject: 'math', type: PLAN_TYPES.DAILY, photo: true },
    { label: '📝 语文', title: '语文暑假作业', description: '完成暑假作业本', subject: 'chinese', type: PLAN_TYPES.DAILY, photo: true },
    { label: '🔤 英语', title: '英语听力练习', description: '听英语音频20分钟跟读', subject: 'english', type: PLAN_TYPES.DAILY },
    { label: '🏃 运动', title: '户外运动', description: '跳绳/跑步/打球至少30分钟', subject: 'exercise', type: PLAN_TYPES.DAILY },
  ]

  function applyTemplate(t) {
    setTitle(t.title); setDescription(t.description)
    setSubject(t.subject); setPlanType(t.type)
    setRequiresPhoto(!!t.photo)
  }

  function toggleDay(i) {
    const d = [...weekDays]; d[i] = !d[i]; setWeekDays(d)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) { alert('请输入任务名称'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/auth'); return }

      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert([{
          user_id: user.id, title: title.trim(), description: description.trim(),
          subject, deadline: deadline || null, plan_type: planType,
          requires_photo: requiresPhoto, week_days: weekDays.map((v, i) => v ? i + 1 : 0).filter(v => v),
        }])
        .select().single()
      if (planError) throw planError

      if (planType === PLAN_TYPES.ONE_TIME || planType === PLAN_TYPES.DAILY) {
        const today = new Date().toISOString().split('T')[0]
        await createTask({
          plan_id: plan.id, user_id: user.id, title: title.trim(),
          subject, due_date: today, deadline: deadline || null,
          requires_photo: requiresPhoto, sort_order: 1,
        })
      }
      alert('✅ 计划创建成功！')
      navigate('/')
    } catch (err) {
      alert('创建失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-5 font-medium hover:opacity-70 transition-opacity" style={{ color: '#64748b' }}>
        <ArrowLeft className="w-4 h-4" />返回
      </button>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1e293b' }}>创建新计划</h1>

      {/* 快捷模板 */}
      <div className="mb-5">
        <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>快捷模板</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t, i) => (
            <button key={i} type="button" onClick={() => applyTemplate(t)}
              className="px-3 py-2 rounded-xl text-sm border hover:shadow-sm transition-all active:scale-[0.97]"
              style={{ borderColor: '#e5e7eb', color: '#374151', background: '#fff' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl shadow-sm p-6 space-y-5" style={{ background: '#ffffff' }}>
        {/* 名称 */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>任务名称 *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：数学口算练习"
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            style={{ borderColor: '#e5e7eb' }} required />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>详细说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例如：完成第15-16页的口算题..."
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none h-20 focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            style={{ borderColor: '#e5e7eb' }} />
        </div>

        {/* 科目 */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>科目</label>
          <div className="grid grid-cols-4 gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.value} type="button" onClick={() => setSubject(s.value)}
                className={`py-2.5 px-3 rounded-xl text-sm border transition-all ${subject === s.value ? 'font-medium' : ''}`}
                style={subject === s.value
                  ? { borderColor: '#f97316', background: '#fff7ed', color: '#ea580c' }
                  : { borderColor: '#e5e7eb', color: '#64748b' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 截止时间 */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>截止时间</label>
          <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            style={{ borderColor: '#e5e7eb' }} />
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>不填表示没有截止时间</p>
        </div>

        {/* 重复模式 */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>重复模式</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: PLAN_TYPES.DAILY, label: '📅 每日', desc: '每天都做' },
              { value: PLAN_TYPES.WEEKLY, label: '🗓️ 每周', desc: '指定星期' },
              { value: PLAN_TYPES.ONE_TIME, label: '📌 一次性', desc: '只做一次' },
            ].map((t) => (
              <button key={t.value} type="button" onClick={() => setPlanType(t.value)}
                className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${planType === t.value ? 'border-orange-400' : 'border-gray-200 hover:border-gray-300'}`}
                style={planType === t.value ? { background: '#fff7ed' } : { background: '#fff' }}>
                <div className="text-sm font-medium" style={{ color: planType === t.value ? '#ea580c' : '#374151' }}>{t.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 每周选择 */}
        {planType === PLAN_TYPES.WEEKLY && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>选择星期</label>
            <div className="flex gap-2">
              {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${weekDays[i] ? 'text-white' : 'text-gray-500'}`}
                  style={weekDays[i] ? { borderColor: '#f97316', background: '#f97316' } : { borderColor: '#e5e7eb', background: '#fff' }}>
                  周{day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 需要拍照 */}
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#f8fafc' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>需要拍照提交</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>书面作业需要拍照片作为完成证明</p>
          </div>
          <button type="button" onClick={() => setRequiresPhoto(!requiresPhoto)}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${requiresPhoto ? 'bg-orange-400' : 'bg-gray-300'}`}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: requiresPhoto ? 'translateX(20px)' : 'translateX(2px)' }} />
          </button>
        </div>

        {/* 提交 */}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          style={{ background: loading ? '#fdba74' : 'linear-gradient(135deg, #f97316, #ea580c)' }}>
          {loading ? '创建中...' : '✨ 创建计划'}
        </button>
      </form>
    </div>
  )
}
