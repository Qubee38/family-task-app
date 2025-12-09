import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import {
  ItemResponse,
  ItemCreateRequest,
  ItemUpdateRequest,
  ItemCompleteRequest,
  CategoryResponse,
  CategoryCreateRequest,
  ItemFilter,
} from '../types/item';
import {
  createItem as apiCreateItem,
  getItems as apiGetItems,
  getItem as apiGetItem,
  updateItem as apiUpdateItem,
  deleteItem as apiDeleteItem,
  completeItem as apiCompleteItem,
  uncompleteItem as apiUncompleteItem,
  getCategories as apiGetCategories,
  createCategory as apiCreateCategory,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
} from '../services/itemApi';
import { logger } from '../utils/logger';

interface ItemContextType {
  // 状態
  items: ItemResponse[];
  categories: CategoryResponse[];
  loading: boolean;
  
  // アイテム操作
  loadItems: (filter?: ItemFilter) => Promise<void>;
  createItem: (data: ItemCreateRequest) => Promise<void>;
  updateItem: (itemId: string, data: ItemUpdateRequest) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  completeItem: (itemId: string) => Promise<void>;
  uncompleteItem: (itemId: string) => Promise<void>;
  
  // カテゴリ操作
  loadCategories: () => Promise<void>;
  createCategory: (data: CategoryCreateRequest) => Promise<void>;
  updateCategory: (categoryId: string, data: CategoryCreateRequest) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedFamily } = useFamily();
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // 家族選択時にカテゴリとアイテムを自動取得
  useEffect(() => {
    if (selectedFamily) {
      loadCategories();
      loadItems();
    } else {
      setItems([]);
      setCategories([]);
    }
  }, [selectedFamily]);

  /**
   * アイテム一覧を取得
   */
  const loadItems = async (filter?: ItemFilter) => {
    if (!selectedFamily) {
      logger.warn('家族が選択されていません');
      return;
    }

    try {
      setLoading(true);
      logger.debug('アイテム一覧取得開始', filter);
      
      const result = await apiGetItems(selectedFamily.familyId, filter);
      
      // フィルターにtypeが指定されている場合は、そのtypeのアイテムのみ更新
      if (filter?.type) {
        setItems(prevItems => {
          // 他のtypeのアイテムは保持し、指定されたtypeのアイテムのみ更新
          const otherTypeItems = prevItems.filter(item => item.type !== filter.type);
          return [...otherTypeItems, ...result.items];
        });
      } else {
        // typeフィルターがない場合は全て置き換え
        setItems(result.items);
      }
      
      logger.info('アイテム一覧取得成功:', { type: filter?.type, count: result.items.length });
    } catch (error) {
      logger.error('アイテム一覧取得エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * アイテムを作成
   */
  const createItem = async (data: ItemCreateRequest) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('アイテム作成開始:', data.title);
      
      const newItem = await apiCreateItem(selectedFamily.familyId, data);
      logger.info('アイテム作成成功:', newItem.itemId);
      
      // アイテム一覧を再取得
      await loadItems();
      
      // カテゴリのusageCountが更新されるため、カテゴリ一覧も再取得
      await loadCategories();
    } catch (error) {
      logger.error('アイテム作成エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * アイテムを更新
   */
  const updateItem = async (itemId: string, data: ItemUpdateRequest) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('アイテム更新開始:', itemId);
      
      await apiUpdateItem(selectedFamily.familyId, itemId, data);
      logger.info('アイテム更新成功');
      
      // アイテム一覧を再取得
      await loadItems();
    } catch (error) {
      logger.error('アイテム更新エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * アイテムを削除
   */
  const deleteItem = async (itemId: string) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('アイテム削除開始:', itemId);
      
      await apiDeleteItem(selectedFamily.familyId, itemId);
      logger.info('アイテム削除成功');
      
      // アイテム一覧を再取得
      await loadItems();
    } catch (error) {
      logger.error('アイテム削除エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * アイテムを完了
   */
  const completeItem = async (itemId: string) => {
    if (!selectedFamily || !user) {
      throw new Error('家族またはユーザーが選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('アイテム完了開始:', itemId);
      
      const completeData: ItemCompleteRequest = {
        completedBy: user.uid,
      };
      
      await apiCompleteItem(selectedFamily.familyId, itemId, completeData);
      logger.info('アイテム完了成功');
      
      // アイテム一覧を再取得
      await loadItems();
    } catch (error) {
      logger.error('アイテム完了エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * アイテムを未完了に戻す
   */
  const uncompleteItem = async (itemId: string) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('アイテム未完了に戻す:', itemId);
      
      await apiUncompleteItem(selectedFamily.familyId, itemId);
      logger.info('アイテム未完了に戻す成功');
      
      // アイテム一覧を再取得
      await loadItems();
    } catch (error) {
      logger.error('アイテム未完了に戻すエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * カテゴリ一覧を取得
   */
  const loadCategories = async () => {
    if (!selectedFamily) {
      logger.warn('家族が選択されていません');
      return;
    }

    try {
      logger.debug('カテゴリ一覧取得開始');
      
      const data = await apiGetCategories(selectedFamily.familyId);
      setCategories(data);
      
      logger.info('カテゴリ一覧取得成功:', data.length);
    } catch (error) {
      logger.error('カテゴリ一覧取得エラー:', error);
      throw error;
    }
  };

  /**
   * カテゴリを作成
   */
  const createCategory = async (data: CategoryCreateRequest) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('カテゴリ作成開始:', data.name);
      
      await apiCreateCategory(selectedFamily.familyId, data);
      logger.info('カテゴリ作成成功');
      
      // カテゴリ一覧を再取得
      await loadCategories();
    } catch (error) {
      logger.error('カテゴリ作成エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * カテゴリを更新
   */
  const updateCategory = async (categoryId: string, data: CategoryCreateRequest) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('カテゴリ更新開始:', categoryId);
      
      await apiUpdateCategory(selectedFamily.familyId, categoryId, data);
      logger.info('カテゴリ更新成功');
      
      // カテゴリ一覧を再取得
      await loadCategories();
    } catch (error) {
      logger.error('カテゴリ更新エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * カテゴリを削除
   */
  const deleteCategory = async (categoryId: string) => {
    if (!selectedFamily) {
      throw new Error('家族が選択されていません');
    }

    try {
      setLoading(true);
      logger.debug('カテゴリ削除開始:', categoryId);
      
      await apiDeleteCategory(selectedFamily.familyId, categoryId);
      logger.info('カテゴリ削除成功');
      
      // カテゴリ一覧を再取得
      await loadCategories();
    } catch (error) {
      logger.error('カテゴリ削除エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ItemContext.Provider
      value={{
        items,
        categories,
        loading,
        loadItems,
        createItem,
        updateItem,
        deleteItem,
        completeItem,
        uncompleteItem,
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </ItemContext.Provider>
  );
};

export const useItem = () => {
  const context = useContext(ItemContext);
  if (context === undefined) {
    throw new Error('useItem must be used within an ItemProvider');
  }
  return context;
};