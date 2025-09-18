import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <button
          key={1}
          onClick={() => handlePageClick(1)}
          className={`px-3 py-1 text-sm rounded-md font-medium transition-all duration-200 cursor-pointer ${
            1 === currentPage
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pageNumbers.push(
          <span key='start-ellipsis' className='px-3 py-1 text-sm'>
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          className={`px-3 py-1 text-sm rounded-md font-medium transition-all duration-200 cursor-pointer ${
            i === currentPage
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <span key='end-ellipsis' className='px-3 py-1 text-sm'>
            ...
          </span>
        );
      }
      pageNumbers.push(
        <button
          key={totalPages}
          onClick={() => handlePageClick(totalPages)}
          className={`px-3 py-1 text-sm rounded-md font-medium transition-all duration-200 cursor-pointer ${
            totalPages === currentPage
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pageNumbers;
  };

  return (
    <div
      className={`flex items-center justify-center space-x-2 ${
        className || ''
      }`}
    >
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className='px-3 py-1 text-sm rounded-md font-medium transition-all duration-200 cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-700 hover:bg-gray-300 dark:text-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <ChevronLeft className='w-4 h-4' />
      </button>
      {renderPageNumbers()}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className='px-3 py-1 text-sm rounded-md font-medium transition-all duration-200 cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-700 hover:bg-gray-300 dark:text-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <ChevronRight className='w-4 h-4' />
      </button>
    </div>
  );
};

export default Pagination;
