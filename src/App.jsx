import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getLevelFromTalent, getLevelColor, getLevelName } from './lib/levelUtils'
import { giveTalentToStudent, takeTalentFromStudent, giveTalentToGroup, getTransactionHistory, getStudentTalentInfo } from './lib/talentTransactions'
import LoginPage from './components/LoginPage'

const USER_STORAGE_KEY = 'levelup2025_user'

// 조별 달란트 관리 컴포넌트
const GroupTalentManagement = ({ userInfo }) => {
  const [groupName, setGroupName] = useState('')
  const [groupAmount, setGroupAmount] = useState('')
  const [groupReason, setGroupReason] = useState('')
  const [groupMsg, setGroupMsg] = useState('')
  const [groupMembers, setGroupMembers] = useState([])

  const handleGroupSearch = async () => {
    if (!groupName.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, grade, church, current_talent, max_talent')
        .eq('role', 'student')
        .eq('group', groupName.trim())
        .order('name', { ascending: true })

      if (error) {
        setGroupMsg('조 검색 실패: ' + error.message)
        return
      }

      setGroupMembers(data || [])
      if (data.length === 0) {
        setGroupMsg('해당 조에 학생이 없습니다.')
      } else {
        setGroupMsg('')
      }
    } catch (err) {
      setGroupMsg('오류가 발생했습니다: ' + err.message)
    }
  }

  const handleGroupTalentGive = async () => {
    const amount = parseInt(groupAmount, 10)
    if (!amount || amount <= 0 || !groupReason.trim() || groupMembers.length === 0) {
      setGroupMsg('수량, 사유, 조 멤버를 확인하세요.')
      return
    }

    const perPersonAmount = Math.floor(amount / groupMembers.length)
    if (perPersonAmount <= 0) {
      setGroupMsg('1인당 지급할 달란트가 0점입니다.')
      return
    }

    setGroupMsg('처리 중...')

    const result = await giveTalentToGroup(
      groupMembers,
      userInfo.id,
      amount,
      groupReason,
      groupName
    )

    if (result.success) {
      setGroupMsg(result.message)
      setGroupAmount('')
      setGroupReason('')
      
      // 조 멤버 정보 새로고침
      handleGroupSearch()
    } else {
      setGroupMsg(result.message)
      
      // 부분 성공인 경우에도 조 멤버 정보 새로고침
      if (result.results && result.results.some(r => r.success)) {
        handleGroupSearch()
      }
    }
  }

  return (
    <div className="bg-[#EC6034] rounded-2xl p-6">
      <h3 className="text-white font-bold mb-4 text-lg">👥 조별 달란트 관리</h3>
      
      {/* 조 검색 */}
      <div className="bg-white/20 rounded-xl p-4 mb-4">
        <h4 className="text-white font-bold mb-3">🔍 조 검색</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="조 이름 입력"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-white text-gray-800"
          />
          <button
            onClick={handleGroupSearch}
            className="bg-white text-[#EC6034] px-4 py-2 rounded-lg font-bold"
          >
            검색
          </button>
        </div>
      </div>

      {/* 조 멤버 목록 */}
      {groupMembers.length > 0 && (
        <div className="bg-white/20 rounded-xl p-4 mb-4">
          <h4 className="text-white font-bold mb-3">📋 {groupName}조 멤버 ({groupMembers.length}명)</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {groupMembers.map((member) => (
              <div key={member.id} className="bg-white/10 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-sm">{member.name}</p>
                    <p className="text-white/80 text-xs">{member.grade}학년 | {member.church}</p>
                  </div>
                  <div className="text-white/80 text-xs">
                    현재: {member.current_talent || 0}점
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 조별 달란트 지급 */}
      {groupMembers.length > 0 && (
        <div className="bg-white/20 rounded-xl p-4">
          <h4 className="text-white font-bold mb-3">💰 조별 달란트 지급</h4>
          <div className="space-y-3">
            <input
              type="number"
              placeholder="총 달란트 수량"
              value={groupAmount}
              onChange={(e) => setGroupAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white text-gray-800"
            />
            <input
              type="text"
              placeholder="사유"
              value={groupReason}
              onChange={(e) => setGroupReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white text-gray-800"
            />
            
            {groupAmount && (
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-white text-sm">
                  1인당 지급: {Math.floor(parseInt(groupAmount) / groupMembers.length) || 0}점
                </p>
              </div>
            )}
            
            <button
              onClick={handleGroupTalentGive}
              className="w-full bg-green-500 text-white py-2 rounded-lg font-bold"
            >
              조별 지급
            </button>
          </div>
        </div>
      )}

      {groupMsg && (
        <div className={`mt-3 p-3 rounded-lg text-sm text-center ${
          groupMsg.includes('완료') ? 'bg-green-500/20 text-white' : 'bg-red-500/20 text-white'
        }`}>
          {groupMsg}
        </div>
      )}
    </div>
  )
}

// 달란트 트랜잭션 히스토리 컴포넌트
const TalentHistory = ({ userInfo }) => {
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const result = await getTransactionHistory(userInfo.id, 20)
      if (result.success) {
        setHistory(result.data)
      } else {
        console.error('히스토리 로드 에러:', result.message)
        setHistory([])
      }
    } catch (err) {
      console.error('히스토리 로드 에러:', err)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [userInfo.id])

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'individual_give': return '개인 지급'
      case 'individual_take': return '개인 회수'
      case 'group_give': return '조별 지급'
      default: return '기타'
    }
  }

  const getTransactionColor = (amount) => {
    return amount > 0 ? 'text-green-300' : 'text-red-300'
  }

  return (
    <div className="bg-[#EC6034] rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">📊 달란트 트랜잭션 히스토리</h3>
        <button
          onClick={loadHistory}
          className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/30"
        >
          새로고침
        </button>
      </div>
      
      <div className="bg-white/20 rounded-xl p-4">
        {historyLoading ? (
          <p className="text-white text-center">로딩 중...</p>
        ) : history.length === 0 ? (
          <p className="text-white text-center">트랜잭션 히스토리가 없습니다.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {history.map((tx) => (
              <div key={tx.id} className="bg-white/10 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-bold text-sm">
                        {tx.student?.name || '알 수 없음'}
                      </span>
                      <span className="text-white/60 text-xs">
                        (@{tx.student?.username || '알 수 없음'})
                      </span>
                    </div>
                    <p className="text-white/80 text-xs mb-1">
                      {tx.student?.grade}학년 | {tx.student?.group}조
                    </p>
                    <p className="text-white text-sm">{tx.reason}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-white/60 text-xs">
                        {getTransactionTypeText(tx.transaction_type)}
                      </span>
                      <span className="text-white/60 text-xs">
                        {new Date(tx.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${getTransactionColor(tx.amount)}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 우리 조 친구들 컴포넌트
const GroupMembers = ({ userInfo }) => {
  const [groupMembers, setGroupMembers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!userInfo.group) return

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username, name, church, grade')
          .eq('group', userInfo.group)
          .eq('role', 'student')
          .neq('username', userInfo.username) // 본인 제외
          .order('name', { ascending: true })

        if (!error && data) {
          setGroupMembers(data)
        }
      } catch (err) {
        console.error('조 멤버 조회 에러:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroupMembers()
  }, [userInfo.group, userInfo.username])

  if (!userInfo.group) {
    return (
      <div className="bg-[#EC6034] rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4 text-lg">👫 우리 조 친구들</h3>
        <div className="bg-white/20 rounded-xl p-4">
          <p className="text-white text-center">조가 배정되지 않았습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#EC6034] rounded-2xl p-6">
      <h3 className="text-white font-bold mb-4 text-lg">👫 우리 조 친구들</h3>
      <div className="bg-white/20 rounded-xl p-4">
        {loading ? (
          <p className="text-white text-center">로딩 중...</p>
        ) : groupMembers.length === 0 ? (
          <p className="text-white text-center">같은 조 친구가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {groupMembers.map((member, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold">{member.name}</p>
                    <p className="text-white/80 text-sm">
                      {member.grade || '미설정'} | {member.church || '미설정'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [userInfo, setUserInfo] = useState(null)

  // 교사용: 학생 검색 및 달란트 지급/회수 관련 state
  const [studentSearch, setStudentSearch] = useState('')
  const [studentResult, setStudentResult] = useState(null)
  const [talentAmount, setTalentAmount] = useState('')
  const [talentReason, setTalentReason] = useState('')
  const [talentAction, setTalentAction] = useState('give') // 'give' or 'take'
  const [talentMsg, setTalentMsg] = useState('')

  // 교사용: 지급/회수 히스토리
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 관리자: 전체 사용자 목록
  const [allUsers, setAllUsers] = useState([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)

  // 관리자: 조/역할 변경 핸들러
  const handleUserFieldChange = async (userId, field, value) => {
    await supabase.from('users').update({ [field]: value }).eq('id', userId)
    // 변경 후 전체 목록 새로고침
    setAllUsersLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, role, grade, "group", church, talent')
      .order('name', { ascending: true })
    if (!error && data) setAllUsers(data)
    setAllUsersLoading(false)
  }

  // 앱 시작 시 localStorage에서 사용자 정보 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY)
    if (saved) {
      try {
        const user = JSON.parse(saved)
        setUserInfo(user)
        setLoginSuccess(true)
      } catch {
        // JSON 파싱 실패 시 localStorage 클리어
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    }
  }, [])

  const handleLogin = (user, role) => {
    const userWithRole = { ...user, role }
    setUserInfo(userWithRole)
    setLoginSuccess(true)
    // localStorage에 사용자 정보 저장
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithRole))
  }

  const handleLogout = () => {
    setUserInfo(null)
    setLoginSuccess(false)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  // 디버깅을 위한 로그
  console.log('App state:', { userInfo, loginSuccess })

  if (!loginSuccess || !userInfo) {
    console.log('Rendering LoginPage')
    return <LoginPage onLogin={handleLogin} />
  }

  // 학생용 레벨 계산
  const currentLevel = userInfo ? getLevelFromTalent(userInfo.max_talent || 0) : 0
  const levelColor = getLevelColor(currentLevel)
  const levelName = getLevelName(currentLevel)

  // 역할별 페이지 렌더링
  return (
    <div className={`min-h-screen bg-[#21AFE6] ${userInfo.role === 'student' ? 'pb-20' : ''}`}>
      {/* 메인 콘텐츠 */}
      <main className="p-4 max-w-md mx-auto">
        <header className="w-full bg-white">
          <img src="/Logo.png" alt="Level Up Logo" className="w-full h-auto" />
        </header>
        {userInfo.role === 'student' && (
          <div className="space-y-4">
            {/* 환영 메시지 및 조 정보 */}
            <div className="bg-[#EC6034] rounded-2xl p-6 mt-4">
              <h2 className="text-white text-xl font-bold mb-2">
                환영합니다! {userInfo.name || userInfo.username}님
              </h2>
              <div className="text-center">
                <div className="text-white text-4xl font-bold mb-2">
                  {userInfo.group || '미배정'}
                </div>
                <p className="text-white/80 text-sm">우리 조가 최고!</p>
              </div>
            </div>

            {/* 현재 달란트 현황 - 크게 표시 */}
            <div className="bg-[#EC6034] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-lg text-center">💰 현재 달란트 현황</h3>
              <div className="text-center">
                <div className="text-white text-6xl font-bold mb-2">
                  {userInfo.current_talent || 0}
                </div>
                <div className="text-white text-xl mb-4">달란트</div>
                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-white/90 text-sm">
                    열심히 활동해서 달란트를 모아보세요! 🎯
                  </p>
                </div>
              </div>
            </div>

            {/* 내 레벨 정보 */}
            <div className="bg-[#EC6034] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-lg">🏆 내 레벨</h3>
              <div className="text-center">
                <div className={`inline-block px-6 py-3 rounded-2xl bg-gradient-to-r ${levelColor} mb-4`}>
                  <div className="text-white text-2xl font-bold">Level {currentLevel}</div>
                  <div className="text-white text-lg">{levelName}</div>
                </div>

                {/* 경험치 바 */}
                <div className="bg-white/20 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white text-sm">다음 레벨까지</span>
                    <span className="text-white text-sm font-bold">
                      {Math.round(((userInfo.max_talent || 0) % 1000) / 1000 * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${levelColor} transition-all duration-500 ease-out`}
                      style={{ width: `${((userInfo.max_talent || 0) % 1000) / 1000 * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 내 정보 */}
            <div className="bg-[#EC6034] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-lg">👥 내 정보</h3>
              <div className="bg-white/20 rounded-xl p-4 space-y-2">
                <p className="text-white">이름: {userInfo.name}</p>
                <p className="text-white">학년: {userInfo.grade || '미설정'}</p>
                <p className="text-white">조: {userInfo.group || '미설정'}</p>
                <p className="text-white">교회: {userInfo.church || '미설정'}</p>
              </div>
            </div>

            {/* 우리 조 친구들 */}
            <GroupMembers userInfo={userInfo} />
          </div>
        )}

        {userInfo.role === 'teacher' && (
          <div className="space-y-4">
            {/* 교사 환영 메시지 */}
            <div className="bg-[#EC6034] rounded-2xl p-6 mt-4">
              <h2 className="text-white text-xl font-bold mb-2">
                환영합니다! {userInfo.name || userInfo.username} 선생님
              </h2>
              <p className="text-white/80 text-sm">달란트 관리 시스템</p>
            </div>

            {/* 1. 개인 달란트 관리 */}
            <div className="bg-[#EC6034] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-lg">👤 개인 달란트 관리</h3>
              
              {/* 학생 검색 */}
              <div className="bg-white/20 rounded-xl p-4 mb-4">
                <h4 className="text-white font-bold mb-3">🔍 학생 검색</h4>
                <input
                  type="text"
                  placeholder="학생 사용자명 입력"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white text-gray-800 mb-3"
                />
                <button
                  onClick={async () => {
                    if (!studentSearch.trim()) return
                    setTalentMsg('')
                    
                    try {
                      const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('role', 'student')
                        .eq('username', studentSearch.trim())
                        .single()
                      
                      if (error || !data) {
                        setStudentResult(null)
                        setTalentMsg('해당 학생을 찾을 수 없습니다.')
                        return
                      }
                      
                      setStudentResult(data)
                      setTalentMsg('')
                    } catch (err) {
                      setStudentResult(null)
                      setTalentMsg('검색 중 오류가 발생했습니다.')
                    }
                  }}
                  className="w-full bg-white text-[#EC6034] py-2 rounded-lg font-bold"
                >
                  검색
                </button>
              </div>

              {/* 개인 달란트 지급/회수 */}
              {studentResult && (
                <div className="bg-white/20 rounded-xl p-4">
                  <h4 className="text-white font-bold mb-3">💰 달란트 지급/회수</h4>
                  <div className="mb-4 p-3 bg-white/10 rounded-lg">
                    <div className="text-white mb-3">
                      <p className="font-bold text-lg">{studentResult.name} (@{studentResult.username})</p>
                      <p className="text-sm">현재: {studentResult.current_talent || 0}점 | 최고: {studentResult.max_talent || 0}점</p>
                      <p className="text-sm">{studentResult.grade}학년 | {studentResult.group}조 | {studentResult.church}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="number"
                        placeholder="달란트 수량"
                        value={talentAmount}
                        onChange={(e) => setTalentAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                      />
                      <input
                        type="text"
                        placeholder="사유"
                        value={talentReason}
                        onChange={(e) => setTalentReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white text-gray-800"
                      />
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            const amount = parseInt(talentAmount, 10)
                            if (!amount || amount <= 0 || !talentReason.trim()) {
                              setTalentMsg('수량과 사유를 올바르게 입력하세요.')
                              return
                            }

                            setTalentMsg('처리 중...')
                            
                            const result = await giveTalentToStudent(
                              studentResult.id,
                              userInfo.id,
                              amount,
                              talentReason
                            )

                            if (result.success) {
                              setTalentMsg(result.message)
                              
                              // 학생 정보 실시간 업데이트
                              const updatedInfo = await getStudentTalentInfo(studentResult.id)
                              if (updatedInfo.success) {
                                setStudentResult(prev => ({
                                  ...prev,
                                  current_talent: updatedInfo.student.current_talent,
                                  max_talent: updatedInfo.student.max_talent
                                }))
                              }
                              
                              setTalentAmount('')
                              setTalentReason('')
                            } else {
                              setTalentMsg(result.message)
                            }
                          }}
                          className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold"
                        >
                          지급
                        </button>
                        
                        <button
                          onClick={async () => {
                            const amount = parseInt(talentAmount, 10)
                            if (!amount || amount <= 0 || !talentReason.trim()) {
                              setTalentMsg('수량과 사유를 올바르게 입력하세요.')
                              return
                            }

                            setTalentMsg('처리 중...')
                            
                            const result = await takeTalentFromStudent(
                              studentResult.id,
                              userInfo.id,
                              amount,
                              talentReason
                            )

                            if (result.success) {
                              setTalentMsg(result.message)
                              
                              // 학생 정보 실시간 업데이트
                              const updatedInfo = await getStudentTalentInfo(studentResult.id)
                              if (updatedInfo.success) {
                                setStudentResult(prev => ({
                                  ...prev,
                                  current_talent: updatedInfo.student.current_talent,
                                  max_talent: updatedInfo.student.max_talent
                                }))
                              }
                              
                              setTalentAmount('')
                              setTalentReason('')
                            } else {
                              setTalentMsg(result.message)
                            }
                          }}
                          className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold"
                        >
                          회수
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {talentMsg && (
                <div className={`mt-3 p-3 rounded-lg text-sm text-center ${
                  talentMsg.includes('완료') ? 'bg-green-500/20 text-white' : 'bg-red-500/20 text-white'
                }`}>
                  {talentMsg}
                </div>
              )}
            </div>

            {/* 2. 조별 달란트 관리 */}
            <GroupTalentManagement userInfo={userInfo} />

            {/* 3. 달란트 트랜잭션 히스토리 */}
            <TalentHistory userInfo={userInfo} />
          </div>
        )}

        {userInfo.role === 'admin' && (
          <div className="bg-[#EC6034] rounded-2xl p-6 mt-4">
            <h2 className="text-white text-xl font-bold mb-4">접근 제한</h2>
            <div className="text-white space-y-4">
              <div className="bg-white/20 rounded-xl p-4 text-center">
                <h3 className="font-bold mb-3">🔒 관리자 기능</h3>
                <p className="mb-4">관리자 기능은 별도의 관리자 앱에서 이용하실 수 있습니다.</p>
                <p className="text-sm text-white/80">보안을 위해 이 앱에서는 관리자 기능이 제한됩니다.</p>>
                        <div>학년: {user.grade || '미설정'} | 조: {user.group || '미설정'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 배너 - 학생일 때만 표시 */}
      {(
        <footer className="fixed bottom-0 left-0 right-0 bg-[#EC6034] p-4 shadow-lg">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-white font-bold text-sm">2025 여름 수련회 Level Up</h1>
                <p className="text-white/80 text-xs">학생 레벨 정보</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white px-3 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
