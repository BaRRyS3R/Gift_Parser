// src/components/GiftFilters.tsx

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Button,
  Slider,
  Divider,
  Chip
} from '@nextui-org/react';
import { Gift } from '@/types/gift';

export interface FilterOptions {
  searchTerm: string;
  priceRange: [number, number];
  sortBy: string;
  rarityFilter: string;
  giftNames: string[];
  modelNames: string[];
  backdropNames: string[];
  symbolNames: string[];
}

interface GiftFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  onSearch: (searchTerm: string) => void;
  gifts: Gift[];
  isLoading?: boolean;
}

export const GiftFilters: React.FC<GiftFiltersProps> = ({
  onFiltersChange,
  onReset,
  onSearch,
  gifts,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    priceRange: [0, 500],
    sortBy: 'price_asc',
    rarityFilter: 'all',
    giftNames: [],
    modelNames: [],
    backdropNames: [],
    symbolNames: []
  });

  const sortOptions = [
    { key: 'price_asc', label: 'Цена: по возрастанию' },
    { key: 'price_desc', label: 'Цена: по убыванию' },
    { key: 'date_desc', label: 'Дата: новые первые' },
    { key: 'date_asc', label: 'Дата: старые первые' },
    { key: 'rarity_asc', label: 'Редкость: частые первые' },
    { key: 'rarity_desc', label: 'Редкость: редкие первые' }
  ];

  const rarityOptions = [
    { key: 'all', label: 'Все редкости' },
    { key: 'legendary', label: 'Легендарные (< 1%)' },
    { key: 'epic', label: 'Эпические (1-5%)' },
    { key: 'rare', label: 'Редкие (5-15%)' },
    { key: 'uncommon', label: 'Необычные (15-30%)' },
    { key: 'common', label: 'Обычные (> 30%)' }
  ];

  // Извлечение уникальных значений из подарков
  const getUniqueValues = (key: 'name' | 'model' | 'backdrop' | 'symbol') => {
    const values = gifts.map(gift => {
      if (key === 'name') return gift.name;
      const value = gift[key];
      // Извлекаем название до скобок с процентами
      return value.split(' (')[0].trim();
    });
    return Array.from(new Set(values)).sort();
  };

  const uniqueGifts = getUniqueValues('name');
  const uniqueModels = getUniqueValues('model');
  const uniqueBackdrops = getUniqueValues('backdrop');
  const uniqueSymbols = getUniqueValues('symbol');

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleMultiSelectUpdate = (key: keyof FilterOptions, selectedKeys: Set<string>) => {
    const selectedArray = Array.from(selectedKeys);
    handleFilterUpdate(key, selectedArray);
  };

  const handleSearchSubmit = () => {
    if (filters.searchTerm.trim()) {
      onSearch(filters.searchTerm.trim());
    }
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      priceRange: [0, 500],
      sortBy: 'price_asc',
      rarityFilter: 'all',
      giftNames: [],
      modelNames: [],
      backdropNames: [],
      symbolNames: []
    };
    setFilters(defaultFilters);
    onReset();
  };

  const removeFilter = (filterType: keyof FilterOptions, value: string) => {
    if (Array.isArray(filters[filterType])) {
      const currentArray = filters[filterType] as string[];
      const updatedArray = currentArray.filter(item => item !== value);
      handleFilterUpdate(filterType, updatedArray);
    }
  };

  return (
    <Card className="filter-section mb-6">
      <CardBody className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Фильтры и сортировка</h2>
          <Button
            variant="flat"
            color="secondary"
            size="sm"
            isDisabled={isLoading}
            onPress={handleReset}
          >
            Сбросить
          </Button>
        </div>

        <Divider />

        {/* Поиск по названию */}
        <div className="space-y-2">
          <label htmlFor="search-input" className="text-sm font-medium text-gray-300">
            Глобальный поиск по маркетплейсу
          </label>
          <div className="flex gap-2">
            <Input
              id="search-input"
              placeholder="Введите название подарка для поиска по всему маркетплейсу"
              value={filters.searchTerm}
              variant="bordered"
              isDisabled={isLoading}
              onValueChange={(value) => handleFilterUpdate("searchTerm", value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            />
            <Button
              color="primary"
              isDisabled={isLoading || !filters.searchTerm.trim()}
              onPress={handleSearchSubmit}
            >
              Найти
            </Button>
          </div>
        </div>

        {/* Диапазон цен */}
        <div className="space-y-3">
          <label htmlFor="price-slider" className="text-sm font-medium text-gray-300">
            Диапазон цен: {filters.priceRange[0]} - {filters.priceRange[1]} TON
          </label>
          <Slider
            id="price-slider"
            step={1}
            minValue={0}
            maxValue={500}
            value={filters.priceRange}
            className="max-w-md"
            isDisabled={isLoading}
            onChange={(value) => handleFilterUpdate("priceRange", value as [number, number])}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Сортировка */}
          <div className="space-y-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-300">
              Сортировка
            </label>
            <Select
              id="sort-select"
              placeholder="Выберите способ сортировки"
              selectedKeys={[filters.sortBy]}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                handleFilterUpdate("sortBy", selected);
              }}
            >
              {sortOptions.map((option) => (
                <SelectItem key={option.key} value={option.key} className="text-white">
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по редкости */}
          <div className="space-y-2">
            <label htmlFor="rarity-select" className="text-sm font-medium text-gray-300">
              Редкость
            </label>
            <Select
              id="rarity-select"
              placeholder="Выберите редкость"
              selectedKeys={[filters.rarityFilter]}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                handleFilterUpdate("rarityFilter", selected);
              }}
            >
              {rarityOptions.map((option) => (
                <SelectItem key={option.key} value={option.key} className="text-white">
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Множественные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Фильтр по подаркам */}
          <div className="space-y-2">
            <label htmlFor="gifts-select" className="text-sm font-medium text-gray-300">
              Подарки
            </label>
            <Select
              id="gifts-select"
              placeholder="Выберите подарки"
              selectionMode="multiple"
              selectedKeys={new Set(filters.giftNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("giftNames", keys as Set<string>)}
            >
              {uniqueGifts.map((gift) => (
                <SelectItem key={gift} value={gift} className="text-white">
                  {gift}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по моделям */}
          <div className="space-y-2">
            <label htmlFor="models-select" className="text-sm font-medium text-gray-300">
              Модели
            </label>
            <Select
              id="models-select"
              placeholder="Выберите модели"
              selectionMode="multiple"
              selectedKeys={new Set(filters.modelNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("modelNames", keys as Set<string>)}
            >
              {uniqueModels.map((model) => (
                <SelectItem key={model} value={model} className="text-white">
                  {model}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по фонам */}
          <div className="space-y-2">
            <label htmlFor="backdrops-select" className="text-sm font-medium text-gray-300">
              Фоны
            </label>
            <Select
              id="backdrops-select"
              placeholder="Выберите фоны"
              selectionMode="multiple"
              selectedKeys={new Set(filters.backdropNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("backdropNames", keys as Set<string>)}
            >
              {uniqueBackdrops.map((backdrop) => (
                <SelectItem key={backdrop} value={backdrop} className="text-white">
                  {backdrop}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по символам */}
          <div className="space-y-2">
            <label htmlFor="symbols-select" className="text-sm font-medium text-gray-300">
              Символы
            </label>
            <Select
              id="symbols-select"
              placeholder="Выберите символы"
              selectionMode="multiple"
              selectedKeys={new Set(filters.symbolNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-default-100 text-white",
                value: "text-white",
                listbox: "text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("symbolNames", keys as Set<string>)}
            >
              {uniqueSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol} className="text-white">
                  {symbol}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Активные фильтры */}
        {(filters.giftNames.length > 0 || filters.modelNames.length > 0 ||
          filters.backdropNames.length > 0 || filters.symbolNames.length > 0) && (
            <div className="space-y-3">
              <Divider />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Активные фильтры:</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.giftNames.map(name => (
                    <Chip
                      key={name}
                      onClose={() => removeFilter("giftNames", name)}
                      variant="flat"
                      color="primary"
                    >
                      Подарок: {name}
                    </Chip>
                  ))}
                  {filters.modelNames.map(name => (
                    <Chip
                      key={name}
                      onClose={() => removeFilter("modelNames", name)}
                      variant="flat"
                      color="secondary"
                    >
                      Модель: {name}
                    </Chip>
                  ))}
                  {filters.backdropNames.map(name => (
                    <Chip
                      key={name}
                      onClose={() => removeFilter("backdropNames", name)}
                      variant="flat"
                      color="success"
                    >
                      Фон: {name}
                    </Chip>
                  ))}
                  {filters.symbolNames.map(name => (
                    <Chip
                      key={name}
                      onClose={() => removeFilter("symbolNames", name)}
                      variant="flat"
                      color="warning"
                    >
                      Символ: {name}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* Информация о результатах */}
        <div className="bg-content2 rounded-lg p-3">
          <p className="text-sm text-gray-400">
            Фильтры применяются автоматически. Глобальный поиск ищет по всему маркетплейсу.
            Данные обновляются каждые 5 минут.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default GiftFilters;