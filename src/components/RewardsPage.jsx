import { useState, useEffect } from 'react'
import { Gift, Star, Trash2, Check } from 'lucide-react'
import { supabase } from '../lib/constants'

export default function RewardsPage() {
  const [rewards, setRewards] = useState([])
  const [newReward, setNewReward] = useState('')
  const [cost, setCost] = useState('')
  const [points, setPoints] = useState(0)
  const [redeemed, setRedeemed] = useState([])
  const [isParent, setIsParent] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setIsParent(profile?.role === 'parent')
      const { data: pts } = await supabase.from('points').select('*').eq('user_id', user.id).single()
      setPoints(pts?.total_points || 0)
      const { data: r } = await supabase.from('rewards').select('*').eq('parent_id', profile?.id || user.id).order('sort_order', { ascending: true })
      setRewards(r || [])
      const { data: rd } = await supabase.from('redemptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setRedeemed(rd || [])
    } catch (err) { console.error(err) }
  }

  async function handleAddReward() {
    if (!newReward.trim() || !cost) { alert('请填写完整信息'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      await supabase.from('rewards').insert([{ parent_id: profile.id, name: newReward.trim(), cost: parseInt(cost), sort_order: rewards.length + 1 }])
      setNewReward(''); setCost(''); loadData()
    } catch (err) { alert('添加失败: ' + err.message) }
  }

  async function handleDeleteReward(id) {
    if (!confirm('确定删除？')) return
    try { await supabase.from('rewards').delete().eq('id', id); loadData() }
    catch (err) { alert('删除失败: ' + err.message) }
  }

  async function handleRedeem(reward) {
    if (points < reward.cost) { alert('积分不够哦！再加油完成任务吧 💪'); return }
    if (!confirm(`要用 ${reward.cost} 积分兑换「${reward.name}」吗？`)) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('points').update({ total_points: points - reward.cost }).eq('user_id', user.id)
      await supabase.from('redemptions').insert([{ user_id: user.id, reward_id: reward.id, reward_name: reward.name, cost: reward.cost }])
      setPoints(points - reward.cost); loadData()
      alert(`🎉 兑换成功！「${reward.name}」`)
    } catch (err) { alert('兑换失败: ' + err.message) }
  }

  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>🎁 奖励中心</h1>
      <p className="text-sm mb-6" style={{ color: '#64748b' }}>我的积分：<span className="font-bold" style={{ color: '#d97706' }}>{points} ⭐</span></p>

      {/* 家长设置 */}
      {isParent && (
        <div className="rounded-2xl p-5 mb-5 shadow-sm" style={{ background: '#ffffff' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>👨‍👩‍👧 设置奖励</p>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newReward} onChange={(e) => setNewReward(e.target.value)} placeholder="奖励内容"
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              style={{ borderColor: '#e5e7eb' }} />
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="积分"
              className="w-24 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-orange-200"
              style={{ borderColor: '#e5e7eb' }} min="1" />
            <button onClick={handleAddReward} className="px-5 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: '#f97316' }}>添加</button>
          </div>
          {rewards.length > 0 && (
            <div className="space-y-2">
              {rewards.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                  <div>
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>{r.name}</span>
                    <span className="text-xs text-amber-600 ml-2">💰 {r.cost} 积分</span>
                  </div>
                  <button onClick={() => handleDeleteReward(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#94a3b8' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 奖励商店 */}
      {rewards.length > 0 && (
        <div className="rounded-2xl p-5 mb-5 shadow-sm" style={{ background: '#ffffff' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>🏪 奖励商店</p>
          <div className="grid grid-cols-2 gap-3">
            {rewards.map(r => (
              <button key={r.id} onClick={() => handleRedeem(r)} disabled={points < r.cost}
                className="p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                style={{
                  borderColor: points >= r.cost ? '#e5e7eb' : '#f1f5f9',
                  opacity: points < r.cost ? 0.5 : 1,
                  background: points >= r.cost ? '#fff' : '#f8fafc',
                }}>
                <Gift className="w-6 h-6 mb-2" style={{ color: '#f97316' }} />
                <p className="text-sm font-medium" style={{ color: '#374151' }}>{r.name}</p>
                <p className="text-xs mt-1" style={{ color: '#d97706' }}>💰 {r.cost} 积分</p>
                {points < r.cost && <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>积分不足</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 兑换记录 */}
      {redeemed.length > 0 && (
        <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#ffffff' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>📜 兑换记录</p>
          <div className="space-y-2">
            {redeemed.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f0fdf4' }}>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm" style={{ color: '#374151' }}>{r.reward_name}</span>
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  -{r.cost} ⭐ · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {rewards.length === 0 && (
        <div className="text-center py-12 rounded-2xl shadow-sm" style={{ background: '#ffffff' }}>
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            {isParent ? '还没有设置奖励，点击上方添加吧！' : '家长还没有设置奖励哦~'}
          </p>
        </div>
      )}
    </div>
  )
}
