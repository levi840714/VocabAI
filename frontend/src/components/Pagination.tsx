import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalCount, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  
  if (totalPages <= 1) {
    return null;
  }
  
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 represents ellipsis
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages); // -1 represents ellipsis
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }
    
    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
      <div className="flex items-center text-sm text-gray-500 dark:text-slate-400">
        顯示第 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} 項，
        共 {totalCount} 項
      </div>
      
      <div className="flex items-center space-x-1">
        {/* 上一頁 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {/* 頁碼 */}
        {visiblePages.map((page, index) => (
          page === -1 ? (
            <div key={`ellipsis-${index}`} className="px-2 py-1">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>
          ) : (
            <Button
              key={page}
              variant={currentPage === page - 1 ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page - 1)}
              className="min-w-[2.5rem]"
            >
              {page}
            </Button>
          )
        ))}
        
        {/* 下一頁 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}