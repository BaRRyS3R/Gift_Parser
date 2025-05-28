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

export default function HomePage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  
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

    // Поиск по названию
    if (filters.searchTerm) {
      filtered = filtered.filter(gift =>
        gift.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Фильтр по цене
    filtered = filtered.filter(gift =>
      gift.price >= filters.priceRange[0] && gift.price <= filters.priceRange[1]
    );

    // Фильтр по лимитированности
    if (filters.showLimitedOnly) {
      filtered = filtered.filter(gift => gift.limited);
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

  const handleFiltersReset = () => {
    setFilteredGifts(gifts);
  };

  const calculateStatistics = () => {
    if (filteredGifts.length === 0) return null;

    const totalGifts = filteredGifts.length;
    const averagePrice = filteredGifts.reduce((sum, gift) => sum + gift.price, 0) / totalGifts;
    const limitedCount = filteredGifts.filter(gift => gift.limited).length;
    const minPrice = Math.min(...filteredGifts.map(gift => gift.price));
    const maxPrice = Math.max(...filteredGifts.map(gift => gift.price));

    return {
      totalGifts,
      averagePrice: averagePrice.toFixed(2),
      limitedCount,
      minPrice,
      maxPrice
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

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <p className="text-2xl font-bold text-warning">{stats.limitedCount}</p>
              <p className="text-sm text-gray-400">Лимитированных</p>
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

      {/* Фильтры */}
      <GiftFilters
        onFiltersChange={applyFilters}
        onReset={handleFiltersReset}
        isLoading={isUpdating}
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
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-2xl">
                        🎁
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{selectedGift.name}</h3>
                        <p className="text-gray-400">#{selectedGift.num}</p>
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