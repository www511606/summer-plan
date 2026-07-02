import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Users } from 'lucide-react'
import { supabase } from '../lib/constants'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/auth'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data: p }) => {
        setProfile(p)
        setChildName(p?.child_name || '')
      })
    })
  }, [navigate])

  async function handleSave() {
    if (!profile) return
    setLoading(true)
    try {
      await supabase.from('profiles').update({ child_name: childName.trim() }).eq('id', profile.id)
      alert('✅ 保存成功！')
    } catch (err) { alert('保存失败: ' + err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-5 font-medium hover:opacity-70 transition-opacity" style={{ color: '#64748b' }}>
        <ArrowLeft className="w-4 h-4" />返回
      </button>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1e293b' }}>⚙️ 设置</h1>

      <div className="rounded-2xl shadow-sm p-6 space-y-6" style={{ background: '#ffffff' }}>
        {/* 账号信息 */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#374151' }}>
            <Users className="w-4 h-4" />账号信息
          </p>
          <div className="p-4 rounded-xl space-y-3" style={{ background: '#f8fafc' }}>
            <div><p className="text-xs" style={{ color: '#94a3b8' }}>昵称</p><p className="text-sm font-medium" style={{ color: '#374151' }}>{profile?.nickname || '-'}</p></div>
            <div><p className="text-xs" style={{ color: '#94a3b8' }}>邮箱</p><p className="text-sm font-medium" style={{ color: '#374151' }}>{profile?.email || '-'}</p></div>
            <div><p className="text-xs" style={{ color: '#94a3b8' }}>身份</p><p className="text-sm font-medium">{profile?.role === 'parent' ? '👨‍👩‍👧 家长' : '👧 孩子'}</p></div>
          </div>
        </div>

        {/* 孩子名字 */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>孩子名字</p>
          <input type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="输入孩子的名字"
            className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            style={{ borderColor: '#e5e7eb' }} />
        </div>

        {/* 使用说明 */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>使用说明</p>
          <div className="p-4 rounded-xl text-sm space-y-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div>
              <p className="font-medium mb-1" style={{ color: '#1e40af' }}>家长操作：</p>
              <ol className="list-decimal list-inside space-y-0.5" style={{ color: '#1d4ed8' }}>
                <li>注册时选择「家长」身份</li>
                <li>点击「新建」创建学习计划</li>
                <li>设置奖励（积分兑换）</li>
                <li>查看孩子提交的任务照片并批注</li>
                <li>不达标可打回重做</li>
              </ol>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: '#1e40af' }}>孩子操作：</p>
              <ol className="list-decimal list-inside space-y-0.5" style={{ color: '#1d4ed8' }}>
                <li>注册时选择「小朋友」身份</li>
                <li>每天查看计划列表</li>
                <li>书面作业拍照上传</li>
                <li>完成任务获得积分</li>
                <li>用积分兑换奖励</li>
              </ol>
            </div>
          </div>
        </div>

        {/* 保存 */}
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 rounded-xl text-white font-semibold transition-all shadow-md flex items-center justify-center gap-2"
          style={{ background: loading ? '#fdba74' : 'linear-gradient(135deg, #f97316, #ea580c)' }}>
          <Save className="w-4 h-4" />{loading ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
