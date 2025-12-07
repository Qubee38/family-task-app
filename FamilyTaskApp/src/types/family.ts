/**
 * 家族管理関連の型定義
 * バックエンドのPydanticモデルと対応
 */

// ============================================
// 家族グループ関連
// ============================================

export interface FamilyCreate {
  name: string;
}

export interface FamilyResponse {
  familyId: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface FamilyUpdate {
  name?: string;
}

export interface FamilyListResponse {
  familyId: string;
  name: string;
  inviteCode: string;
  role: 'admin' | 'member';
  memberCount: number;
  joinedAt: string;
}

export interface FamilyDetailResponse extends FamilyResponse {
  members: FamilyMemberResponse[];
}

// ============================================
// メンバー関連
// ============================================

export interface FamilyMemberResponse {
  userId: string;
  displayName: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
  photoURL: string | null;
}

export interface MemberRoleUpdate {
  role: 'admin' | 'member';
}

// ============================================
// 招待関連
// ============================================

export interface InvitationCreate {
  email: string;
}

export interface InvitationResponse {
  invitationId: string;
  familyId: string;
  email: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedByName?: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface InvitationAccept {
  inviteCode: string;
}

export interface InvitationAcceptResponse {
  familyId: string;
  familyName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}