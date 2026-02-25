import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteOption {
  id: number | string;
  label: string;
  subtitle?: string;
}

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  options: AutocompleteOption[];
  value: AutocompleteOption | null;
  onChange: (option: AutocompleteOption | null) => void;
  onSearch?: (query: string) => void;
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
  isLoading?: boolean;
  error?: string;
  disabled?: boolean;
}

export function Autocomplete({
  label,
  placeholder = 'Search...',
  options,
  value,
  onChange,
  onSearch,
  onCreateNew,
  createNewLabel = 'Create new',
  isLoading = false,
  error,
  disabled = false,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      setQuery(value.label);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsOpen(true);
    onSearch?.(newQuery);
  };

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option);
    setQuery(option.label);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim());
      setIsOpen(false);
    }
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  const showCreateNew = onCreateNew && query.trim() && !filteredOptions.some(
    (opt) => opt.label.toLowerCase() === query.toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-sm border rounded-lg
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
          `}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : filteredOptions.length === 0 && !showCreateNew ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results found</div>
          ) : (
            <>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</div>
                  {option.subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{option.subtitle}</div>
                  )}
                </button>
              ))}
              {showCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full px-4 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none border-t border-gray-100 dark:border-gray-700"
                >
                  <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {createNewLabel}: "{query}"
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
