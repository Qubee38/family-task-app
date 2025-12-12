import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  FamilyListResponse,
  FamilyDetailResponse,
  FamilyCreate,
  FamilyUpdate,
  InvitationCreate,
  InvitationAccept,
  MemberRoleUpdate,
} from '../types/family';
import {
  createFamily as apiCreateFamily,
  getUserFamilies as apiGetUserFamilies,
  getFamilyDetail as apiGetFamilyDetail,
  updateFamily as apiUpdateFamily,
  deleteFamily as apiDeleteFamily,
  createInvitation as apiCreateInvitation,
  acceptInvitation as apiAcceptInvitation,
  getFamilyMembers as apiGetFamilyMembers,
  updateMemberRole as apiUpdateMemberRole,
  deleteMember as apiDeleteMember,
} from '../services/familyApi';
import { logger } from '../utils/logger';

const LAST_SELECTED_FAMILY_KEY = '@last_selected_family_id';

interface FamilyContextType {
  // 状態
  families: FamilyListResponse[];
  selectedFamily: FamilyDetailResponse | null;
  loading: boolean;
  
  // 家族グループ操作
  loadFamilies: () => Promise<void>;
  createFamily: (data: FamilyCreate) => Promise<void>;
  selectFamily: (familyId: string | null) => Promise<void>;
  updateFamily: (familyId: string, data: FamilyUpdate) => Promise<void>;
  deleteFamily: (familyId: string) => Promise<void>;
  
  // 招待操作
  createInvitation: (familyId: string, data: InvitationCreate) => Promise<void>;
  acceptInvitation: (data: InvitationAccept) => Promise<void>;
  
  // メンバー管理
  updateMemberRole: (familyId: string, userId: string, data: MemberRoleUpdate) => Promise<void>;
  removeMember: (familyId: string, userId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [families, setFamilies] = useState<FamilyListResponse[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // ユーザーログイン時に家族一覧を取得
  useEffect(() => {
    if (user) {
      loadFamilies();
    } else {
      setFamilies([]);
      setSelectedFamily(null);
    }
  }, [user]);

  /**
   * AsyncStorageから前回選択した家族IDを取得
   */
  const getLastSelectedFamilyId = async (): Promise<string | null> => {
    try {
      const familyId = await AsyncStorage.getItem(LAST_SELECTED_FAMILY_KEY);
      return familyId;
    } catch (error) {
      logger.error('前回選択家族ID取得エラー:', error);
      return null;
    }
  };

  /**
   * AsyncStorageに選択した家族IDを保存
   */
  const saveLastSelectedFamilyId = async (familyId: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(LAST_SELECTED_FAMILY_KEY, familyId);
      logger.debug('前回選択家族ID保存:', familyId);
    } catch (error) {
      logger.error('前回選択家族ID保存エラー:', error);
    }
  };

  /**
   * AsyncStorageから前回選択した家族IDを削除
   */
  const clearLastSelectedFamilyId = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(LAST_SELECTED_FAMILY_KEY);
      logger.debug('前回選択家族IDクリア');
    } catch (error) {
      logger.error('前回選択家族IDクリアエラー:', error);
    }
  };

  /**
   * 所属家族一覧を取得
   */
  const loadFamilies = async () => {
    try {
      setLoading(true);
      logger.debug('家族一覧取得開始');
      
      const data = await apiGetUserFamilies();
      setFamilies(data);
      
      logger.info('家族一覧取得成功:', data.length);
      
      // 前回選択した家族を自動選択
      const lastSelectedId = await getLastSelectedFamilyId();
      
      if (lastSelectedId && data.some(f => f.familyId === lastSelectedId)) {
        // 前回選択した家族が存在する場合
        logger.debug('前回選択家族を自動選択:', lastSelectedId);
        await selectFamily(lastSelectedId);
      } else if (data.length === 1 && !selectedFamily) {
        // 家族が1つだけの場合は自動選択
        logger.debug('家族が1つのため自動選択:', data[0].familyId);
        await selectFamily(data[0].familyId);
      } else {
        // それ以外の場合は選択なし（FamilyListScreenで選択を促す）
        logger.debug('家族選択なし（手動選択が必要）');
      }
    } catch (error) {
      logger.error('家族一覧取得エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 家族グループを作成
   */
  const createFamily = async (data: FamilyCreate) => {
    try {
      setLoading(true);
      logger.debug('家族作成開始:', data.name);
      
      const newFamily = await apiCreateFamily(data);
      logger.info('家族作成成功:', newFamily.familyId);
      
      // 家族一覧を再取得
      await loadFamilies();
      
      // 作成した家族を自動選択
      await selectFamily(newFamily.familyId);
    } catch (error) {
      logger.error('家族作成エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 家族を選択（詳細情報を取得）
   * @param familyId - 選択する家族ID、nullの場合は選択解除
   */
  const selectFamily = async (familyId: string | null) => {
    try {
      setLoading(true);
      
      // nullの場合は選択解除
      if (familyId === null) {
        logger.debug('家族選択解除');
        setSelectedFamily(null);
        await clearLastSelectedFamilyId();
        return;
      }
      
      logger.debug('家族選択:', familyId);
      
      const detail = await apiGetFamilyDetail(familyId);
      setSelectedFamily(detail);
      
      // AsyncStorageに保存
      await saveLastSelectedFamilyId(familyId);
      
      logger.info('家族詳細取得成功:', detail.name);
    } catch (error) {
      logger.error('家族詳細取得エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 家族情報を更新
   */
  const updateFamily = async (familyId: string, data: FamilyUpdate) => {
    try {
      setLoading(true);
      logger.debug('家族更新開始:', familyId);
      
      await apiUpdateFamily(familyId, data);
      logger.info('家族更新成功');
      
      // 家族一覧を再取得
      await loadFamilies();
      
      // 選択中の家族を再取得
      if (selectedFamily?.familyId === familyId) {
        await selectFamily(familyId);
      }
    } catch (error) {
      logger.error('家族更新エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 家族グループを削除
   */
  const deleteFamily = async (familyId: string) => {
    try {
      setLoading(true);
      logger.debug('家族削除開始:', familyId);
      
      await apiDeleteFamily(familyId);
      logger.info('家族削除成功');
      
      // 選択中の家族をクリア
      if (selectedFamily?.familyId === familyId) {
        setSelectedFamily(null);
        await clearLastSelectedFamilyId();
      }
      
      // 家族一覧を再取得
      await loadFamilies();
    } catch (error) {
      logger.error('家族削除エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 招待を作成
   */
  const createInvitation = async (familyId: string, data: InvitationCreate) => {
    try {
      setLoading(true);
      logger.debug('招待作成開始:', data.email);
      
      await apiCreateInvitation(familyId, data);
      logger.info('招待作成成功');
    } catch (error) {
      logger.error('招待作成エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 招待を承認（招待コード入力）
   */
  const acceptInvitation = async (data: InvitationAccept) => {
    try {
      setLoading(true);
      logger.debug('招待承認開始:', data.inviteCode);
      
      const result = await apiAcceptInvitation(data);
      logger.info('招待承認成功:', result.familyName);
      
      // 家族一覧を再取得
      await loadFamilies();
      
      // 参加した家族を自動選択
      await selectFamily(result.familyId);
    } catch (error) {
      logger.error('招待承認エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * メンバーの権限を変更
   */
  const updateMemberRole = async (
    familyId: string,
    userId: string,
    data: MemberRoleUpdate
  ) => {
    try {
      setLoading(true);
      logger.debug('権限変更開始:', userId, data.role);
      
      await apiUpdateMemberRole(familyId, userId, data);
      logger.info('権限変更成功');
      
      // 選択中の家族を再取得
      if (selectedFamily?.familyId === familyId) {
        await selectFamily(familyId);
      }
    } catch (error) {
      logger.error('権限変更エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * メンバーを削除
   */
  const removeMember = async (familyId: string, userId: string) => {
    try {
      setLoading(true);
      logger.debug('メンバー削除開始:', userId);
      
      await apiDeleteMember(familyId, userId);
      logger.info('メンバー削除成功');
      
      // 選択中の家族を再取得
      if (selectedFamily?.familyId === familyId) {
        await selectFamily(familyId);
      }
      
      // 自分自身を削除した場合は家族一覧を再取得
      if (user?.uid === userId) {
        await loadFamilies();
        setSelectedFamily(null);
        await clearLastSelectedFamilyId();
      }
    } catch (error) {
      logger.error('メンバー削除エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FamilyContext.Provider
      value={{
        families,
        selectedFamily,
        loading,
        loadFamilies,
        createFamily,
        selectFamily,
        updateFamily,
        deleteFamily,
        createInvitation,
        acceptInvitation,
        updateMemberRole,
        removeMember,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};