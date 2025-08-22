import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Palette, BarChart3, FolderOpen } from "lucide-react";
import { memWhizAPI } from "@/lib/api";
import { isLocalDevelopment } from "@/hooks/use-telegram";

interface Category {
  id: number;
  category_name: string;
  color_code: string;
  is_default: boolean;
  created_at: string;
}

interface CategoryStats {
  [key: string]: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const { toast } = useToast();
  const navigate = useNavigate();

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#EC4899', '#6366F1', '#14B8A6', '#F59E0B'
  ];

  useEffect(() => {
    loadCategories();
    loadCategoryStats();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      let endpoint = '/v1/categories';
      
      // 本地測試模式下添加 user_id 參數
      if (isLocalDevelopment()) {
        endpoint += '?user_id=613170570';
      }
      
      const response = await memWhizAPI.request(endpoint);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: "載入失敗",
        description: "無法載入分類列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    try {
      let endpoint = '/v1/categories/stats';
      
      // 本地測試模式下添加 user_id 參數
      if (isLocalDevelopment()) {
        endpoint += '?user_id=613170570';
      }
      
      const response = await memWhizAPI.request(endpoint);
      setCategoryStats(response.category_stats || {});
    } catch (error) {
      console.error('Failed to load category stats:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "請輸入分類名稱",
        variant: "destructive",
      });
      return;
    }

    try {
      let endpoint = '/v1/categories';
      
      // 本地測試模式下添加 user_id 參數
      if (isLocalDevelopment()) {
        endpoint += '?user_id=613170570';
      }
      
      await memWhizAPI.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          category_name: newCategoryName.trim(),
          color_code: newCategoryColor,
        }),
      });

      toast({
        title: "分類創建成功",
        description: `分類「${newCategoryName}」已創建`,
      });

      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      setShowCreateForm(false);
      loadCategories();
      loadCategoryStats();
    } catch (error: any) {
      toast({
        title: "創建失敗",
        description: error.message || "無法創建分類",
        variant: "destructive",
      });
    }
  };

  const handleViewCategoryWords = (categoryName: string) => {
    // 處理「未分類」的導航映射：前端顯示「未分類」，但資料庫使用「uncategorized」
    const navigationCategory = categoryName === '未分類' ? 'uncategorized' : categoryName;
    // 導航到單字列表頁並預設選中該分類
    navigate('/vocabulary', { state: { selectedCategory: navigationCategory } });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 頁面標題 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Tag className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">分類管理</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          管理您的單字分類，讓學習更有條理
        </p>
      </div>

      {/* 統計概覽 */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            分類統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">總分類數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(categoryStats).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">總單字數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {categories.filter(c => !c.is_default).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">自定義分類</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {categories.filter(c => c.is_default).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">系統分類</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 創建新分類按鈕 */}
      <div className="mb-6">
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          創建新分類
        </Button>
      </div>

      {/* 創建分類表單 */}
      {showCreateForm && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg">創建新分類</CardTitle>
            <CardDescription>
              為您的單字創建一個新的分類標籤
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">分類名稱</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="輸入分類名稱，例如：考試重點"
                className="max-w-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                <Palette className="w-4 h-4 inline mr-1" />
                選擇顏色
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newCategoryColor === color 
                        ? 'border-gray-900 dark:border-white scale-110' 
                        : 'border-gray-300 dark:border-gray-600'
                    } transition-all duration-200`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateCategory} className="bg-blue-600 hover:bg-blue-700">
                創建分類
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分類列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          所有分類 ({categories.length})
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            // 處理「未分類」的名稱映射
            const statsKey = category.category_name === '未分類' ? 'uncategorized' : category.category_name;
            const wordCount = categoryStats[statsKey] || 0;
            
            return (
              <Card 
                key={category.id} 
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => handleViewCategoryWords(category.category_name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color_code }}
                      />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {category.category_name}
                      </h3>
                    </div>
                    {category.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        系統
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{wordCount} 個單字</span>
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    點擊查看此分類的所有單字
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">尚無分類</p>
            <p className="text-sm">點擊上方按鈕創建您的第一個分類</p>
          </div>
        )}
      </div>
    </div>
  );
}