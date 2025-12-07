/**
 * 家族管理APIクライアント
 * バックエンドの家族管理エンドポイントと対応
 */

import api from './api';
import {
  FamilyCreate,
  FamilyResponse,
  FamilyUpdate,
  FamilyListResponse,
  FamilyDetailResponse,
  FamilyMemberResponse,
  MemberRoleUpdate,
  InvitationCreate,
  InvitationResponse,
  InvitationAccept,
  InvitationAcceptResponse,
} from '../types/family';

// ============================================
// 家族グループAPI
// ============================================

/**
 * 家族グループを作成
 */
export const createFamily = async (data: FamilyCreate): Promise<FamilyResponse> => {
  const response = await api.post<FamilyResponse>('/api/families', data);
  return response.data;
};

/**
 * 所属家族一覧を取得
 */
export const getUserFamilies = async (): Promise<FamilyListResponse[]> => {
  const response = await api.get<FamilyListResponse[]>('/api/families');
  return response.data;
};

/**
 * 家族詳細を取得（メンバー情報含む）
 */
export const getFamilyDetail = async (familyId: string): Promise<FamilyDetailResponse> => {
  const response = await api.get<FamilyDetailResponse>(`/api/families/${familyId}`);
  return response.data;
};

/**
 * 家族情報を更新（管理者のみ）
 */
export const updateFamily = async (
  familyId: string,
  data: FamilyUpdate
): Promise<FamilyResponse> => {
  const response = await api.put<FamilyResponse>(`/api/families/${familyId}`, data);
  return response.data;
};

/**
 * 家族グループを削除（管理者のみ）
 */
export const deleteFamily = async (familyId: string): Promise<void> => {
  await api.delete(`/api/families/${familyId}`);
};

// ============================================
// メンバー管理API
// ============================================

/**
 * メンバー一覧を取得
 */
export const getFamilyMembers = async (familyId: string): Promise<FamilyMemberResponse[]> => {
  const response = await api.get<FamilyMemberResponse[]>(`/api/families/${familyId}/members`);
  return response.data;
};

/**
 * メンバーの権限を変更（管理者のみ）
 */
export const updateMemberRole = async (
  familyId: string,
  userId: string,
  data: MemberRoleUpdate
): Promise<FamilyMemberResponse> => {
  const response = await api.put<FamilyMemberResponse>(
    `/api/families/${familyId}/members/${userId}`,
    data
  );
  return response.data;
};

/**
 * メンバーを削除（管理者のみ、または自分自身）
 */
export const deleteMember = async (familyId: string, userId: string): Promise<void> => {
  await api.delete(`/api/families/${familyId}/members/${userId}`);
};

// ============================================
// 招待管理API
// ============================================

/**
 * 招待を作成（メールアドレス指定）
 */
export const createInvitation = async (
  familyId: string,
  data: InvitationCreate
): Promise<InvitationResponse> => {
  const response = await api.post<InvitationResponse>(
    `/api/families/${familyId}/invitations`,
    data
  );
  return response.data;
};

/**
 * 招待一覧を取得
 * @param familyId 家族ID
 * @param status フィルタ（オプション）: 'pending' | 'accepted' | 'expired'
 */
export const getFamilyInvitations = async (
  familyId: string,
  status?: string
): Promise<InvitationResponse[]> => {
  const params = status ? { status } : {};
  const response = await api.get<InvitationResponse[]>(
    `/api/families/${familyId}/invitations`,
    { params }
  );
  return response.data;
};

/**
 * 招待を承認（招待コード入力）
 */
export const acceptInvitation = async (
  data: InvitationAccept
): Promise<InvitationAcceptResponse> => {
  const response = await api.post<InvitationAcceptResponse>(
    '/api/families/invitations/accept',
    data
  );
  return response.data;
};

/**
 * 招待を削除（管理者のみ）
 */
export const deleteInvitation = async (
  familyId: string,
  invitationId: string
): Promise<void> => {
  await api.delete(`/api/families/${familyId}/invitations/${invitationId}`);
};

// ============================================
// オブジェクト形式でエクスポート（オプション）
// ============================================

export const familyApi = {
  // 家族グループ
  createFamily,
  getUserFamilies,
  getFamilyDetail,
  updateFamily,
  deleteFamily,
  
  // メンバー管理
  getFamilyMembers,
  updateMemberRole,
  deleteMember,
  
  // 招待管理
  createInvitation,
  getFamilyInvitations,
  acceptInvitation,
  deleteInvitation,
};

export default familyApi;