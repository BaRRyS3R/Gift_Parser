// src/components/GiftFilters.tsx

import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  Input, 
  Select, 
  SelectItem, 
  Button, 
  Slider,
  Switch,
  Divider
} from '@nextui-org/react';

export interface FilterOptions {
  searchTerm: string;
  priceRange: [number, number];
  sortBy: string;
  showLimitedOnly: boolean;
  rarityFilter: string;
}

interface GiftFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export const GiftFilters: React.FC<GiftFiltersProps> = ({
  onFiltersChange,
  onReset,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    priceRange: [0, 100],
    sortBy: 'price_asc',
    showLimitedOnly: false,
    rarityFilter: 'all'
  });

  const sortOptions = [
    { key: 'price_asc', label: 'Цена: по возрастанию' },
    { key: 'price_desc', label: 'Цена: по убыванию' },
    { key: 'date_desc', label: 'Дата: новые первые' },
    { key: 'date_asc', label: 'Дата: старые первые' },
    { key: 'rarity_desc', label: 'Редкость: высокая первая' },
    { key: 'rarity_asc', label: 'Редкость: низкая первая' }
  ];

  const rarityOptions = [
    { key: 'all', label: 'Все редкости' },
    { key: 'legendary', label: 'Легендарные (< 1%)' },
    { key: 'epic', label: 'Эпические (1-5%)' },
    { key: 'rare', label: 'Редкие (5-15%)' },
    { key: 'uncommon', label: 'Необычные (15-30%)' },
    { key: 'common', label: 'Обычные (> 30%)' }
  ];

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      priceRange: [0, 100],
      sortBy: 'price_asc',
      showLimitedOnly: false,
      rarityFilter: 'all'
    };
    setFilters(defaultFilters);
    onReset();
  };

  return (
    <Card className="filter-section mb-6">
      <CardBody className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Фильтры и сортировка</h2>
          <Button
            variant="flat"
            color="secondary"
            size="sm"
            onPress={handleReset}
            isDisabled={isLoading}
          >
            Сбросить
          </Button>
        </div>

        <Divider />

        {/* Поиск по названию */}
        <div className="space-y-2">
          <label htmlFor="search-input" className="text-sm font-medium text-gray-400">
            Поиск по названию
          </label>
          <Input
            id="search-input"
            placeholder="Введите название подарка"
            value={filters.searchTerm}
            variant="bordered"
            isDisabled={isLoading}
            onValueChange={(value) => handleFilterUpdate("searchTerm", value)}
          />
        </div>

        {/* Диапазон цен */}
        <div className="space-y-3">
          <label htmlFor="price-slider" className="text-sm font-medium text-gray-400">
            Диапазон цен: {filters.priceRange[0]} - {filters.priceRange[1]} TON
          </label>
          <Slider
            id="price-slider"
            step={1}
            minValue={0}
            maxValue={100}
            value={filters.priceRange}
            className="max-w-md"
            isDisabled={isLoading}
            onChange={(value) => handleFilterUpdate("priceRange", value as [number, number])}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Сортировка */}
          <div className="space-y-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-400">
              Сортировка
            </label>
            <Select
              id="sort-select"
              placeholder="Выберите способ сортировки"
              selectedKeys={[filters.sortBy]}
              variant="bordered"
              isDisabled={isLoading}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                handleFilterUpdate("sortBy", selected);
              }}
            >
              {sortOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Фильтр по редкости */}
          <div className="space-y-2">
            <label htmlFor="rarity-select" className="text-sm font-medium text-gray-400">
              Редкость
            </label>
            <Select
              id="rarity-select"
              placeholder="Выберите редкость"
              selectedKeys={[filters.rarityFilter]}
              variant="bordered"
              isDisabled={isLoading}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                handleFilterUpdate("rarityFilter", selected);
              }}
            >
              {rarityOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Дополнительные опции */}
        <div className="space-y-3">
          <Divider />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label htmlFor="limited-switch" className="text-sm font-medium">
                Только лимитированные подарки
              </label>
              <p className="text-xs text-gray-400">
                Показывать только подарки с ограниченным тиражом
              </p>
            </div>
            <Switch
              id="limited-switch"
              isSelected={filters.showLimitedOnly}
              isDisabled={isLoading}
              onValueChange={(value) => handleFilterUpdate("showLimitedOnly", value)}
            />
          </div>
        </div>

        {/* Информация о результатах */}
        <div className="bg-content2 rounded-lg p-3">
          <p className="text-sm text-gray-400">
            Фильтры будут применены автоматически при изменении параметров. Данные
            обновляются каждые 5 минут.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default GiftFilters;