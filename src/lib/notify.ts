import { supabase } from './supabase';

/**
 * 알림 생성 공통 유틸
 * 
 * @param userId 알림 받을 유저 ID
 * @param type 알림 타입 ('review_like' | 'post_like' | 'inquiry' | 'inquiry_reply' | 'group_approved')
 * @param title 알림 제목
 * @param message 알림 메시지
 * @param groupId 관련 그룹 ID (optional)
 * @param targetId 대상 ID (게시글, 문의, 리뷰 등)
 */
export async function insertNotification({
  userId,
  type,
  title,
  message,
  groupId = null,
  targetId = null,
}: {
  userId: string;
  type: 'review_like' | 'post_like' | 'inquiry' | 'inquiry_reply' | 'group_approved';
  title: string;
  message: string;
  groupId?: string | null;
  targetId?: string | null;
}) {
  if (!userId) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    group_id: groupId,
    target_id: targetId,
  });
  if (error) console.error('[insertNotification] 알림 전송 실패:', error.message);
}
