import { supabase } from './supabase'

/**
 * 안전한 달란트 트랜잭션 처리 함수 (데이터베이스 함수 사용)
 * @param {string} studentId - 학생 ID
 * @param {string} teacherId - 교사 ID
 * @param {number} amount - 달란트 수량 (음수면 차감, 양수면 지급)
 * @param {string} reason - 사유
 * @param {string} transactionType - 트랜잭션 타입
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
const processTalentTransaction = async (studentId, teacherId, amount, reason, transactionType) => {
  try {
    const { data, error } = await supabase.rpc('process_talent_transaction', {
      p_student_id: studentId,
      p_teacher_id: teacherId,
      p_amount: amount,
      p_reason: reason,
      p_transaction_type: transactionType
    })

    if (error) {
      console.error('트랜잭션 처리 실패:', error)
      return { success: false, message: '트랜잭션 처리에 실패했습니다: ' + error.message }
    }

    if (!data.success) {
      return { success: false, message: data.error }
    }

    return {
      success: true,
      message: `${data.student_name}에게 ${amount > 0 ? '지급' : '차감'} 완료! (${Math.abs(amount)}점)`,
      data: data
    }
  } catch (error) {
    console.error('트랜잭션 처리 중 오류:', error)
    return { success: false, message: '오류가 발생했습니다: ' + error.message }
  }
}

/**
 * 개인 달란트 지급 함수
 * @param {string} studentId - 학생 ID
 * @param {string} teacherId - 교사 ID
 * @param {number} amount - 지급할 달란트 수량
 * @param {string} reason - 지급 사유
 * @returns {Promise<{success: boolean, message: string, updatedStudent?: object}>}
 */
export const giveTalentToStudent = async (studentId, teacherId, amount, reason) => {
  return await processTalentTransaction(studentId, teacherId, amount, reason, 'individual_give')
}

/**
 * 개인 달란트 회수 함수
 * @param {string} studentId - 학생 ID
 * @param {string} teacherId - 교사 ID
 * @param {number} amount - 회수할 달란트 수량
 * @param {string} reason - 회수 사유
 * @returns {Promise<{success: boolean, message: string, updatedStudent?: object}>}
 */
export const takeTalentFromStudent = async (studentId, teacherId, amount, reason) => {
  return await processTalentTransaction(studentId, teacherId, -amount, reason, 'individual_take')
}

/**
 * 조별 달란트 지급 함수
 * @param {Array} groupMembers - 조 멤버 배열
 * @param {string} teacherId - 교사 ID
 * @param {number} totalAmount - 총 달란트 수량
 * @param {string} reason - 지급 사유
 * @param {string} groupName - 조 이름
 * @returns {Promise<{success: boolean, message: string, updatedMembers?: Array}>}
 */
export const giveTalentToGroup = async (groupMembers, teacherId, totalAmount, reason, groupName) => {
  try {
    if (!groupMembers || groupMembers.length === 0) {
      return { success: false, message: '조 멤버가 없습니다.' }
    }

    const perPersonAmount = Math.floor(totalAmount / groupMembers.length)
    if (perPersonAmount <= 0) {
      return { success: false, message: '1인당 지급할 달란트가 0점입니다.' }
    }

    const results = []
    let successCount = 0
    let failCount = 0

    // 각 학생에게 안전한 트랜잭션 처리
    for (const member of groupMembers) {
      const result = await processTalentTransaction(
        member.id,
        teacherId,
        perPersonAmount,
        `${reason} (조별 지급: ${groupName})`,
        'group_give'
      )

      results.push({
        studentId: member.id,
        studentName: member.name,
        success: result.success,
        message: result.message,
        data: result.data
      })

      if (result.success) {
        successCount++
      } else {
        failCount++
        console.error(`${member.name} 트랜잭션 실패:`, result.message)
      }
    }

    if (failCount === 0) {
      return {
        success: true,
        message: `${groupName}조 ${groupMembers.length}명에게 각각 ${perPersonAmount}점씩 지급 완료!`,
        results
      }
    } else if (successCount > 0) {
      return {
        success: false,
        message: `${groupName}조 중 ${successCount}명 성공, ${failCount}명 실패`,
        results
      }
    } else {
      return {
        success: false,
        message: `${groupName}조 모든 학생 트랜잭션 실패`,
        results
      }
    }
  } catch (error) {
    console.error('조별 달란트 지급 중 오류:', error)
    return { success: false, message: '오류가 발생했습니다: ' + error.message }
  }
}

/**
 * 트랜잭션 히스토리 조회 함수
 * @param {string} teacherId - 교사 ID
 * @param {number} limit - 조회할 트랜잭션 수 (기본값: 20)
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const getTransactionHistory = async (teacherId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('talent_transactions')
      .select(`
        id, amount, reason, created_at, transaction_type,
        student:users!talent_transactions_student_id_fkey(name, username, grade, "group")
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('트랜잭션 히스토리 조회 실패:', error)
      return { success: false, message: '트랜잭션 히스토리 조회에 실패했습니다: ' + error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('트랜잭션 히스토리 조회 중 오류:', error)
    return { success: false, message: '오류가 발생했습니다: ' + error.message }
  }
}

/**
 * 학생의 현재 달란트 정보를 실시간으로 조회하는 함수
 * @param {string} studentId - 학생 ID
 * @returns {Promise<{success: boolean, student?: object, message?: string}>}
 */
export const getStudentTalentInfo = async (studentId) => {
  try {
    const { data: student, error } = await supabase
      .from('users')
      .select('id, name, username, current_talent, max_talent, grade, "group"')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (error) {
      console.error('학생 정보 조회 실패:', error)
      return { success: false, message: '학생 정보 조회에 실패했습니다: ' + error.message }
    }

    if (!student) {
      return { success: false, message: '학생을 찾을 수 없습니다.' }
    }

    return { success: true, student }
  } catch (error) {
    console.error('학생 정보 조회 중 오류:', error)
    return { success: false, message: '오류가 발생했습니다: ' + error.message }
  }
}

/**
 * 모든 학생의 달란트 정보를 조회하는 함수 (교사용)
 * @returns {Promise<{success: boolean, students?: Array, message?: string}>}
 */
export const getAllStudentsTalentInfo = async () => {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, name, username, current_talent, max_talent, grade, "group", church')
      .eq('role', 'student')
      .order('name')

    if (error) {
      console.error('전체 학생 정보 조회 실패:', error)
      return { success: false, message: '학생 정보 조회에 실패했습니다: ' + error.message }
    }

    return { success: true, students: students || [] }
  } catch (error) {
    console.error('전체 학생 정보 조회 중 오류:', error)
    return { success: false, message: '오류가 발생했습니다: ' + error.message }
  }
}