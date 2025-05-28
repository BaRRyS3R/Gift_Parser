// src/app/page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  Spinner,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@nextui-org/react';
import { Gift } from '@/types/gift';
import { apiService } from '@/services/apiService';
import GiftCard from '@/components/GiftCard';
import GiftFilters, { FilterOptions } from '@/components/GiftFilters';
import GiftImage from '@/components/GiftImage';

export default function HomePage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [searchMode, setSearchMode] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Загрузка данных о подарках
  const loadGifts = useCallback(async (page: number = 1, append: boolean = false) => {
    const isInitialLoad = page === 1 && !append;

    if (isInitialLoad) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsUpdating(true);
    }

    try {
      const response = await apiService.getPageGifts({
        page,
        limit: 30
      });

      if (response.success && response.data) {
        const newGifts = response.data;

        if (newGifts.length === 0) {
          setHasMoreData(false);
        } else {
          setGifts(prevGifts => append ? [...prevGifts, ...newGifts] : newGifts);
          setLastUpdate(new Date());
        }
      } else {
        setError(response.error || 'Ошибка при загрузке данных');
      }
    } catch (err) {
      setError('Произошла ошибка при подключении к серверу');
      console.error('Error loading gifts:', err);
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, []);

  // Применение фильтров
  const applyFilters = useCallback((filters: FilterOptions) => {
    let filtered = [...gifts];

    // Фильтр по цене
    filtered = filtered.filter(gift =>
      gift.price >= filters.priceRange[0] && gift.price <= filters.priceRange[1]
    );

    // Фильтр по названиям подарков
    if (filters.giftNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.giftNames.includes(gift.name)
      );
    }

    // Фильтр по моделям
    if (filters.modelNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.modelNames.some(model => gift.model.includes(model))
      );
    }

    // Фильтр по фонам
    if (filters.backdropNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.backdropNames.some(backdrop => gift.backdrop.includes(backdrop))
      );
    }

    // Фильтр по символам
    if (filters.symbolNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.symbolNames.some(symbol => gift.symbol.includes(symbol))
      );
    }

    // Фильтр по редкости
    if (filters.rarityFilter !== 'all') {
      filtered = filtered.filter(gift => {
        const modelRarity = parseFloat(gift.model.match(/\d+\.?\d*/)?.[0] || '100');

        switch (filters.rarityFilter) {
          case 'legendary': return modelRarity < 1;
          case 'epic': return modelRarity >= 1 && modelRarity < 5;
          case 'rare': return modelRarity >= 5 && modelRarity < 15;
          case 'uncommon': return modelRarity >= 15 && modelRarity < 30;
          case 'common': return modelRarity >= 30;
          default: return true;
        }
      });
    }

    // Сортировка
    switch (filters.sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.export_at).getTime() - new Date(a.export_at).getTime());
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.export_at).getTime() - new Date(b.export_at).getTime());
        break;
      case 'rarity_asc':
        filtered.sort((a, b) => {
          const aRarity = parseFloat(a.model.match(/\d+\.?\d*/)?.[0] || '100');
          const bRarity = parseFloat(b.model.match(/\d+\.?\d*/)?.[0] || '100');
          return bRarity - aRarity; // Чем больше процент, тем менее редкий
        });
        break;
      case 'rarity_desc':
        filtered.sort((a, b) => {
          const aRarity = parseFloat(a.model.match(/\d+\.?\d*/)?.[0] || '100');
          const bRarity = parseFloat(b.model.match(/\d+\.?\d*/)?.[0] || '100');
          return aRarity - bRarity; // Чем меньше процент, тем более редкий
        });
        break;
      default:
        break;
    }

    setFilteredGifts(filtered);
  }, [gifts]);

  // Автоматическое обновление данных
  useEffect(() => {
    const interval = setInterval(() => {
      loadGifts(1, false);
    }, 5 * 60 * 1000); // 5 минут

    return () => clearInterval(interval);
  }, [loadGifts]);

  // Первоначальная загрузка
  useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  // Обновление отфильтрованного списка при изменении исходных данных
  useEffect(() => {
    setFilteredGifts(gifts);
  }, [gifts]);

  const handleLoadMore = () => {
    if (!isUpdating && hasMoreData) {
      loadGifts(currentPage + 1, true);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleGiftDetails = (gift: Gift) => {
    setSelectedGift(gift);
    onOpen();
  };

  const handleGlobalSearch = async (searchTerm: string) => {
    setIsSearching(true);
    setSearchMode(true);
    setError(null);

    try {
      const response = await apiService.searchGiftsByName(searchTerm);

      if (response.success && response.data) {
        setGifts(response.data);
        setFilteredGifts(response.data);
        setLastUpdate(new Date());
      } else {
        setError(response.error || 'Ошибка при поиске подарков');
      }
    } catch (err) {
      setError('Произошла ошибка при поиске');
      console.error('Error searching gifts:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFiltersReset = () => {
    if (searchMode) {
      // Если мы в режиме поиска, загружаем обычные данные
      setSearchMode(false);
      loadGifts();
    } else {
      // Просто сбрасываем фильтры
      setFilteredGifts(gifts);
    }
  };

  const calculateStatistics = () => {
    if (filteredGifts.length === 0) return null;

    const totalGifts = filteredGifts.length;
    const averagePrice = filteredGifts.reduce((sum, gift) => sum + gift.price, 0) / totalGifts;
    const minPrice = Math.min(...filteredGifts.map(gift => gift.price));
    const maxPrice = Math.max(...filteredGifts.map(gift => gift.price));

    // Подсчет по редкости
    const rarityStats = filteredGifts.reduce((acc, gift) => {
      const modelRarity = parseFloat(gift.model.match(/\d+\.?\d*/)?.[0] || '100');
      if (modelRarity < 1) acc.legendary++;
      else if (modelRarity < 5) acc.epic++;
      else if (modelRarity < 15) acc.rare++;
      else if (modelRarity < 30) acc.uncommon++;
      else acc.common++;
      return acc;
    }, { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 });

    return {
      totalGifts,
      averagePrice: averagePrice.toFixed(2),
      minPrice,
      maxPrice,
      rarityStats
    };
  };

  const stats = calculateStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gray-400">Загрузка данных о подарках...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardBody className="text-center space-y-4">
            <p className="text-red-500">Ошибка загрузки данных</p>
            <p className="text-gray-400">{error}</p>
            <Button color="primary" onPress={() => loadGifts()}>
              Попробовать снова
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Индикатор обновления */}
      {isUpdating && (
        <div className="update-indicator updating">
          Обновление данных...
        </div>
      )}

      {/* Индикатор поиска */}
      {isSearching && (
        <div className="update-indicator updating">
          Поиск по маркетплейсу...
        </div>
      )}

      {searchMode && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-primary">
            Показаны результаты поиска по всему маркетплейсу.
            Нажмите &quot;Сбросить&quot; для возврата к обычному просмотру.
          </p>
        </div>
      )}

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stats-card">
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalGifts}</p>
              <p className="text-sm text-gray-400">Всего подарков</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-success">{stats.averagePrice}</p>
              <p className="text-sm text-gray-400">Средняя цена (TON)</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-secondary">{stats.minPrice}</p>
              <p className="text-sm text-gray-400">Мин. цена (TON)</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-danger">{stats.maxPrice}</p>
              <p className="text-sm text-gray-400">Макс. цена (TON)</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Дополнительная статистика по редкости */}
      {stats?.rarityStats && (
        <div className="grid grid-cols-5 gap-2">
          <Card className="stats-card">
            <CardBody className="text-center p-3">
              <p className="text-lg font-bold text-yellow-500">{stats.rarityStats.legendary}</p>
              <p className="text-xs text-gray-400">Легендарных</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center p-3">
              <p className="text-lg font-bold text-purple-500">{stats.rarityStats.epic}</p>
              <p className="text-xs text-gray-400">Эпических</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center p-3">
              <p className="text-lg font-bold text-blue-500">{stats.rarityStats.rare}</p>
              <p className="text-xs text-gray-400">Редких</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center p-3">
              <p className="text-lg font-bold text-green-500">{stats.rarityStats.uncommon}</p>
              <p className="text-xs text-gray-400">Необычных</p>
            </CardBody>
          </Card>
          <Card className="stats-card">
            <CardBody className="text-center p-3">
              <p className="text-lg font-bold text-gray-500">{stats.rarityStats.common}</p>
              <p className="text-xs text-gray-400">Обычных</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Фильтры */}
      <GiftFilters
        onFiltersChange={applyFilters}
        onReset={handleFiltersReset}
        onSearch={handleGlobalSearch}
        gifts={gifts}
        isLoading={isUpdating || isSearching}
      />

      {/* Информация о последнем обновлении */}
      {lastUpdate && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Последнее обновление: {lastUpdate.toLocaleString('ru-RU')}
          </span>
          <Button
            size="sm"
            variant="flat"
            onPress={() => loadGifts()}
            isLoading={isUpdating}
          >
            Обновить сейчас
          </Button>
        </div>
      )}

      {/* Список подарков */}
      {filteredGifts.length > 0 ? (
        <div className="space-y-4">
          <div className="gifts-grid">
            {filteredGifts.map((gift) => (
              <GiftCard
                key={`${gift.num}-${gift.message_id}`}
                gift={gift}
                onViewDetails={handleGiftDetails}
              />
            ))}
          </div>

          {/* Кнопка "Загрузить еще" */}
          {hasMoreData && (
            <div className="flex justify-center mt-8">
              <Button
                color="primary"
                variant="flat"
                onPress={handleLoadMore}
                isLoading={isUpdating}
                size="lg"
              >
                Загрузить еще подарки
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-400 text-lg">
              Подарки не найдены по заданным критериям
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Попробуйте изменить параметры фильтрации
            </p>
          </CardBody>
        </Card>
      )}

      {/* Модальное окно с деталями подарка */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Подробная информация о подарке
              </ModalHeader>
              <ModalBody>
                {selectedGift && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <GiftImage
                        gift={selectedGift}
                        width={64}
                        height={64}
                        className="shadow-md"
                        fallbackEmoji="🎁"
                      />
                      <div>
                        <h3 className="text-xl font-bold">{selectedGift.name}</h3>
                        <p className="text-gray-400">#{selectedGift.gift_num || selectedGift.num}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Цена</p>
                        <p className="text-lg font-bold text-primary">
                          {selectedGift.price} {selectedGift.asset}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Статус</p>
                        <Chip color="success" variant="flat">
                          {selectedGift.status === 'forsale' ? 'В продаже' : selectedGift.status}
                        </Chip>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Характеристики:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Модель:</span>
                          <span>{selectedGift.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Фон:</span>
                          <span>{selectedGift.backdrop}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Символ:</span>
                          <span>{selectedGift.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Лимитированный:</span>
                          <span>{selectedGift.limited ? 'Да' : 'Нет'}</span>
                        </div>
                        {selectedGift.export_at && (
                          <div className="flex justify-between">
                            <span>Дата экспорта:</span>
                            <span>{new Date(selectedGift.export_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Закрыть
                </Button>
                <Button color="primary" onPress={onClose}>
                  Открыть в Tonnel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}