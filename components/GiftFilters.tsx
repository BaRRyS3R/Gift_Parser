// src/components/GiftFilters.tsx

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  Select,
  SelectItem,
  Button,
  Slider,
  Divider,
  Chip
} from '@nextui-org/react';
import { Gift } from '@/types/gift';

export interface FilterOptions {
  priceRange: [number, number];
  sortBy: string;
  modelNames: string[];
  backdropNames: string[];
  symbolNames: string[];
}

interface GiftFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  gifts: Gift[];
  isLoading?: boolean;
}

export const GiftFilters: React.FC<GiftFiltersProps> = ({
  onFiltersChange,
  onReset,
  gifts,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 1000],
    sortBy: 'price_asc',
    modelNames: [],
    backdropNames: [],
    symbolNames: []
  });

  const sortOptions = [
    { key: 'price_asc', label: 'Цена: по возрастанию' },
    { key: 'price_desc', label: 'Цена: по убыванию' },
    { key: 'date_desc', label: 'Дата: новые первые' },
    { key: 'date_asc', label: 'Дата: старые первые' }
  ];

  // Извлечение уникальных значений из подарков
  const getUniqueValues = (key: 'model' | 'backdrop' | 'symbol') => {
    const values = gifts.map(gift => {
      const value = gift[key];
      // Извлекаем название до скобок с процентами
      return value.split(' (')[0].trim();
    });
    return Array.from(new Set(values)).sort();
  };

  const uniqueModels = getUniqueValues('model');
  const uniqueBackdrops = getUniqueValues('backdrop');
  const uniqueSymbols = getUniqueValues('symbol');

  // Устанавливаем максимальное значение цены на основе данных
  useEffect(() => {
    if (gifts.length > 0) {
      const maxPrice = Math.max(...gifts.map(gift => gift.price));
      const adjustedMaxPrice = Math.ceil(maxPrice * 1.1); // Добавляем 10% запаса

      setFilters(prevFilters => ({
        ...prevFilters,
        priceRange: [0, Math.min(adjustedMaxPrice, prevFilters.priceRange[1])]
      }));
    }
  }, [gifts]);

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleMultiSelectUpdate = (key: keyof FilterOptions, selectedKeys: Set<string>) => {
    const selectedArray = Array.from(selectedKeys);
    handleFilterUpdate(key, selectedArray);
  };

  const handleReset = () => {
    const maxPrice = gifts.length > 0 ? Math.max(...gifts.map(gift => gift.price)) : 1000;
    const adjustedMaxPrice = Math.ceil(maxPrice * 1.1);

    const defaultFilters: FilterOptions = {
      priceRange: [0, adjustedMaxPrice],
      sortBy: 'price_asc',
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

  const maxPrice = gifts.length > 0 ? Math.max(...gifts.map(gift => gift.price)) : 1000;
  const adjustedMaxPrice = Math.ceil(maxPrice * 1.1);

  return (
    <Card className="bg-slate-800 border-slate-600 mb-6">
      <CardBody className="space-y-6 p-6">
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

        <Divider className="bg-slate-600" />

        {/* Диапазон цен */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">
            Диапазон цен: {filters.priceRange[0]} - {filters.priceRange[1]} TON
          </label>
          <Slider
            step={1}
            minValue={0}
            maxValue={adjustedMaxPrice}
            value={filters.priceRange}
            className="max-w-md"
            isDisabled={isLoading}
            onChange={(value) => handleFilterUpdate("priceRange", value as [number, number])}
            classNames={{
              base: "max-w-md",
              track: "border-s-gray-600",
              filler: "bg-blue-500"
            }}
          />
        </div>

        {/* Сортировка */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Сортировка
          </label>
          <Select
            placeholder="Выберите способ сортировки"
            selectedKeys={[filters.sortBy]}
            variant="bordered"
            isDisabled={isLoading}
            className="max-w-md"
            classNames={{
              trigger: "bg-slate-700 border-slate-600 text-white",
              value: "text-white",
              listbox: "bg-slate-800 text-white"
            }}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              handleFilterUpdate("sortBy", selected);
            }}
          >
            {sortOptions.map((option) => (
              <SelectItem
                key={option.key}
                value={option.key}
                className="text-white hover:bg-slate-700"
              >
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Множественные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Фильтр по моделям */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Модели ({uniqueModels.length})
            </label>
            <Select
              placeholder="Выберите модели"
              selectionMode="multiple"
              selectedKeys={new Set(filters.modelNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-slate-700 border-slate-600 text-white",
                value: "text-white",
                listbox: "bg-slate-800 text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("modelNames", keys as Set<string>)}
            >
              {uniqueModels.map((model) => (
                <SelectItem
                  key={model}
                  value={model}
                  className="text-white hover:bg-slate-700"
                >
                  {model}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по фонам */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Фоны ({uniqueBackdrops.length})
            </label>
            <Select
              placeholder="Выберите фоны"
              selectionMode="multiple"
              selectedKeys={new Set(filters.backdropNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-slate-700 border-slate-600 text-white",
                value: "text-white",
                listbox: "bg-slate-800 text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("backdropNames", keys as Set<string>)}
            >
              {uniqueBackdrops.map((backdrop) => (
                <SelectItem
                  key={backdrop}
                  value={backdrop}
                  className="text-white hover:bg-slate-700"
                >
                  {backdrop}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по символам */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Символы ({uniqueSymbols.length})
            </label>
            <Select
              placeholder="Выберите символы"
              selectionMode="multiple"
              selectedKeys={new Set(filters.symbolNames)}
              variant="bordered"
              isDisabled={isLoading}
              classNames={{
                trigger: "bg-slate-700 border-slate-600 text-white",
                value: "text-white",
                listbox: "bg-slate-800 text-white"
              }}
              onSelectionChange={(keys) => handleMultiSelectUpdate("symbolNames", keys as Set<string>)}
            >
              {uniqueSymbols.map((symbol) => (
                <SelectItem
                  key={symbol}
                  value={symbol}
                  className="text-white hover:bg-slate-700"
                >
                  {symbol}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Активные фильтры */}
        {(filters.modelNames.length > 0 || filters.backdropNames.length > 0 || filters.symbolNames.length > 0) && (
          <div className="space-y-3">
            <Divider className="bg-slate-600" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Активные фильтры:</h4>
              <div className="flex flex-wrap gap-2">
                {filters.modelNames.map(name => (
                  <Chip
                    key={name}
                    onClose={() => removeFilter("modelNames", name)}
                    variant="flat"
                    color="primary"
                    className="bg-blue-600/20 text-blue-400 border-blue-500/30"
                  >
                    Модель: {name}
                  </Chip>
                ))}
                {filters.backdropNames.map(name => (
                  <Chip
                    key={name}
                    onClose={() => removeFilter("backdropNames", name)}
                    variant="flat"
                    color="secondary"
                    className="bg-purple-600/20 text-purple-400 border-purple-500/30"
                  >
                    Фон: {name}
                  </Chip>
                ))}
                {filters.symbolNames.map(name => (
                  <Chip
                    key={name}
                    onClose={() => removeFilter("symbolNames", name)}
                    variant="flat"
                    color="success"
                    className="bg-green-600/20 text-green-400 border-green-500/30"
                  >
                    Символ: {name}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Информация о результатах */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-300">
            Фильтры применяются автоматически к результатам поиска.
            Используйте фильтры для уточнения поиска по модели, фону и символу.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default GiftFilters;