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
  useDisclosure,
  Select,
  SelectItem,
  Switch,
  Tabs,
  Tab
} from '@nextui-org/react';
import { Gift, MarketplaceType } from '@/types/gift';
import { unifiedMarketplaceService } from '@/services/unifiedMarketplaceService';
import GiftCard from '@/components/GiftCard';
import GiftFilters, { FilterOptions } from '@/components/GiftFilters';
import GiftImage from '@/components/GiftImage';

export default function HomePage() {
  // Core state management
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedGiftName, setSelectedGiftName] = useState<string>('');
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceType>('tonnel');
  const [searchAllMarketplaces, setSearchAllMarketplaces] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalFoundGifts, setTotalFoundGifts] = useState(0);
  const [marketplaceErrors, setMarketplaceErrors] = useState<Array<{ marketplace: MarketplaceType; error: string }>>([]);
  const [marketplacesSearched, setMarketplacesSearched] = useState<MarketplaceType[]>([]);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Get available collections based on marketplace selection
  const getAvailableCollections = useCallback(() => {
    if (searchAllMarketplaces) {
      return unifiedMarketplaceService.getAllAvailableCollections();
    } else {
      const collections = unifiedMarketplaceService.getAvailableCollections(selectedMarketplace);
      return Object.keys(collections).map(name => ({ name, marketplaces: [selectedMarketplace] }));
    }
  }, [selectedMarketplace, searchAllMarketplaces]);

  // Multi-marketplace gift search function
  const searchGiftsByName = useCallback(async (giftName: string) => {
    setIsSearching(true);
    setError(null);
    setGifts([]);
    setFilteredGifts([]);
    setTotalFoundGifts(0);
    setHasMoreData(true);
    setMarketplaceErrors([]);
    setMarketplacesSearched([]);

    try {
      console.log(`Starting search for: ${giftName} on ${searchAllMarketplaces ? 'all marketplaces' : selectedMarketplace}`);

      const searchResult = await unifiedMarketplaceService.searchAcrossMarketplaces({
        giftName,
        marketplace: selectedMarketplace,
        options: {
          includeAllMarketplaces: searchAllMarketplaces,
          preferredMarketplace: selectedMarketplace
        }
      });

      setMarketplacesSearched(searchResult.marketplacesSearched);
      setMarketplaceErrors(searchResult.errors);

      if (searchResult.totalFound === 0) {
        if (searchResult.errors.length > 0) {
          const errorMessages = searchResult.errors.map(e => `${e.marketplace}: ${e.error}`).join('; ');
          setError(`Search failed - ${errorMessages}`);
        } else {
          setError(`No gifts found for "${giftName}" on the selected marketplace(s)`);
        }
        setHasMoreData(false);
      } else {
        setGifts(searchResult.gifts);

        const initialDisplay = searchResult.gifts.slice(0, 50);
        setFilteredGifts(initialDisplay);
        setTotalFoundGifts(searchResult.totalFound);
        setLastUpdate(new Date());

        setHasMoreData(searchResult.gifts.length > 50);

        console.log(`Successfully loaded ${searchResult.totalFound} gifts for ${giftName} from ${searchResult.marketplacesSearched.join(', ')}`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching for gifts');
    } finally {
      setIsSearching(false);
    }
  }, [selectedMarketplace, searchAllMarketplaces]);

  // Load more gifts from the already loaded set
  const handleLoadMore = useCallback(() => {
    if (!hasMoreData || isSearching) return;

    const currentDisplayed = filteredGifts.length;
    const remainingGifts = gifts.length - currentDisplayed;

    if (remainingGifts > 0) {
      const nextBatch = gifts.slice(currentDisplayed, currentDisplayed + 50);
      setFilteredGifts(prevGifts => [...prevGifts, ...nextBatch]);

      const newDisplayedCount = currentDisplayed + nextBatch.length;
      setHasMoreData(newDisplayedCount < gifts.length);

      console.log(`Displayed ${nextBatch.length} more gifts. Total displayed: ${newDisplayedCount}/${gifts.length}`);
    } else {
      setHasMoreData(false);
    }
  }, [gifts, filteredGifts, hasMoreData, isSearching]);

  // Apply filters to the complete gift set
  const applyFilters = useCallback((filters: FilterOptions) => {
    let filtered = [...gifts];

    // Price filter
    filtered = filtered.filter(gift =>
      gift.price >= filters.priceRange[0] && gift.price <= filters.priceRange[1]
    );

    // Model filter
    if (filters.modelNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.modelNames.some(model => gift.model.includes(model))
      );
    }

    // Backdrop filter
    if (filters.backdropNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.backdropNames.some(backdrop => gift.backdrop.includes(backdrop))
      );
    }

    // Symbol filter
    if (filters.symbolNames.length > 0) {
      filtered = filtered.filter(gift =>
        filters.symbolNames.some(symbol => gift.symbol.includes(symbol))
      );
    }

    // Sorting
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

    const initialDisplay = filtered.slice(0, 50);
    setFilteredGifts(initialDisplay);
    setHasMoreData(filtered.length > 50);

    console.log(`Filters applied. Showing ${initialDisplay.length} of ${filtered.length} filtered gifts`);
  }, [gifts]);

  // Reset filters
  const handleFiltersReset = useCallback(() => {
    if (gifts.length > 0) {
      const initialDisplay = gifts.slice(0, 50);
      setFilteredGifts(initialDisplay);
      setHasMoreData(gifts.length > 50);

      console.log(`Filters reset. Displaying ${initialDisplay.length} of ${gifts.length} total gifts`);
    }
  }, [gifts]);

  // Handle gift name selection
  const handleGiftNameSelect = useCallback((giftName: string) => {
    setSelectedGiftName(giftName);
    searchGiftsByName(giftName);
  }, [searchGiftsByName]);

  // Handle gift details modal
  const handleGiftDetails = (gift: Gift) => {
    setSelectedGift(gift);
    onOpen();
  };

  // Calculate comprehensive statistics
  const calculateStatistics = useCallback(() => {
    if (gifts.length === 0) return null;

    const totalGifts = gifts.length;
    const displayedGifts = filteredGifts.length;
    const giftsWithPrice = gifts.filter(g => g.price > 0);
    const averagePrice = giftsWithPrice.length > 0
      ? giftsWithPrice.reduce((sum, gift) => sum + gift.price, 0) / giftsWithPrice.length
      : 0;
    const minPrice = giftsWithPrice.length > 0 ? Math.min(...giftsWithPrice.map(gift => gift.price)) : 0;
    const maxPrice = giftsWithPrice.length > 0 ? Math.max(...giftsWithPrice.map(gift => gift.price)) : 0;

    // Marketplace breakdown
    const marketplaceBreakdown = gifts.reduce((acc, gift) => {
      acc[gift.marketplace] = (acc[gift.marketplace] || 0) + 1;
      return acc;
    }, {} as Record<MarketplaceType, number>);

    return {
      totalGifts,
      displayedGifts,
      averagePrice: averagePrice.toFixed(2),
      minPrice,
      maxPrice,
      marketplaceBreakdown
    };
  }, [gifts, filteredGifts]);

  const stats = calculateStatistics();
  const availableCollections = getAvailableCollections();

  // Prepare gift options for select
  const giftOptions = availableCollections.map(collection => ({
    key: collection.name,
    label: `${collection.name} (${collection.marketplaces.join(', ')})`
  })).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="space-y-6">
      {/* Enhanced loading indicator */}
      {isSearching && (
        <div className="fixed top-6 right-6 bg-blue-500/90 text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg z-50 flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="flex flex-col">
            <span>
              {searchAllMarketplaces
                ? 'Поиск на всех маркетплейсах...'
                : `Поиск на ${selectedMarketplace}...`}
            </span>
            <span className="text-xs opacity-80">Это может занять несколько секунд</span>
          </div>
        </div>
      )}

      {/* Marketplace and gift selection card */}
      <Card className="bg-slate-800 border-slate-600">
        <CardBody className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Поиск подарков на маркетплейсах</h2>
              <p className="text-gray-300 text-sm">
                Выберите маркетплейс и подарок для поиска всех доступных экземпляров
              </p>
            </div>

            {/* Marketplace selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label htmlFor="marketplace-select" className="text-sm font-medium text-gray-300">Маркетплейс</label>
                <Select
                  id="marketplace-select"
                  placeholder="Выберите маркетплейс"
                  variant="bordered"
                  selectedKeys={[selectedMarketplace]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as MarketplaceType;
                    if (selected) {
                      setSelectedMarketplace(selected);
                      setSelectedGiftName(''); // Reset gift selection when marketplace changes
                    }
                  }}
                  classNames={{
                    trigger: "bg-slate-700 border-slate-600 text-white",
                    value: "text-white",
                    listbox: "bg-slate-800 text-white"
                  }}
                >
                  <SelectItem key="tonnel" value="tonnel" className="text-white hover:bg-slate-700">
                    Tonnel Network
                  </SelectItem>
                  <SelectItem key="portals" value="portals" className="text-white hover:bg-slate-700">
                    Portals Market
                  </SelectItem>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="search-all-marketplaces"
                    isSelected={searchAllMarketplaces}
                    onValueChange={setSearchAllMarketplaces}
                    size="sm"
                  />
                  <label htmlFor="search-all-marketplaces" className="text-sm text-gray-300">Поиск на всех маркетплейсах</label>
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="gift-select" className="text-sm font-medium text-gray-300">Подарок</label>
                <Select
                  id="gift-select"
                  placeholder="Выберите подарок для поиска"
                  variant="bordered"
                  selectedKeys={selectedGiftName ? [selectedGiftName] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) {
                      handleGiftNameSelect(selected);
                    }
                  }}
                  classNames={{
                    trigger: "bg-slate-700 border-slate-600 text-white",
                    value: "text-white",
                    listbox: "bg-slate-800 text-white"
                  }}
                >
                  {giftOptions.map((option) => (
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
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Enhanced results summary with marketplace information */}
      {selectedGiftName && (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Результаты поиска: {selectedGiftName}
                  </h3>
                  <div className="space-y-1">
                    {totalFoundGifts > 0 && (
                      <>
                        <p className="text-gray-300 text-sm">
                          Найдено {totalFoundGifts} подарков на продаже
                        </p>
                        <p className="text-gray-400 text-xs">
                          Отображается {filteredGifts.length} из {totalFoundGifts} подарков
                        </p>
                        {marketplacesSearched.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-400">Маркетплейсы:</span>
                            {marketplacesSearched.map(mp => (
                              <Chip key={mp} size="sm" variant="flat" color="primary">
                                {mp}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {lastUpdate && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-2">
                      Обновлено: {lastUpdate.toLocaleString('ru-RU')}
                    </p>
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={() => selectedGiftName && handleGiftNameSelect(selectedGiftName)}
                      isLoading={isSearching}
                    >
                      Обновить
                    </Button>
                  </div>
                )}
              </div>

              {/* Marketplace errors */}
              {marketplaceErrors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-yellow-400 text-sm font-medium">Предупреждения:</p>
                  {marketplaceErrors.map((error, index) => (
                    <div key={index} className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-300 text-sm">
                        <span className="font-medium">{error.marketplace}:</span> {error.error}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Enhanced comprehensive statistics with marketplace breakdown */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="text-center p-4">
                <p className="text-2xl font-bold text-blue-400">{stats.totalGifts}</p>
                <p className="text-sm text-gray-300">Всего найдено</p>
              </CardBody>
            </Card>
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="text-center p-4">
                <p className="text-2xl font-bold text-purple-400">{stats.displayedGifts}</p>
                <p className="text-sm text-gray-300">Отображается</p>
              </CardBody>
            </Card>
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="text-center p-4">
                <p className="text-2xl font-bold text-green-400">{stats.averagePrice}</p>
                <p className="text-sm text-gray-300">Средняя цена (TON)</p>
              </CardBody>
            </Card>
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="text-center p-4">
                <p className="text-2xl font-bold text-yellow-400">{stats.minPrice}</p>
                <p className="text-sm text-gray-300">Мин. цена (TON)</p>
              </CardBody>
            </Card>
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="text-center p-4">
                <p className="text-2xl font-bold text-red-400">{stats.maxPrice}</p>
                <p className="text-sm text-gray-300">Макс. цена (TON)</p>
              </CardBody>
            </Card>
          </div>

          {/* Marketplace breakdown */}
          {Object.keys(stats.marketplaceBreakdown).length > 1 && (
            <Card className="bg-slate-800 border-slate-600">
              <CardBody className="p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Распределение по маркетплейсам</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.marketplaceBreakdown).map(([marketplace, count]) => (
                    <div key={marketplace} className="text-center">
                      <p className="text-xl font-bold text-cyan-400">{count}</p>
                      <p className="text-sm text-gray-300 capitalize">{marketplace}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Filters section */}
      {gifts.length > 0 && (
        <GiftFilters
          onFiltersChange={applyFilters}
          onReset={handleFiltersReset}
          gifts={gifts}
          isLoading={isSearching}
        />
      )}

      {/* Error display */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/20">
          <CardBody className="text-center p-6">
            <p className="text-red-400 text-lg">Ошибка при поиске</p>
            <p className="text-gray-300 mt-2">{error}</p>
            {selectedGiftName && (
              <Button
                color="danger"
                variant="flat"
                className="mt-4"
                onPress={() => handleGiftNameSelect(selectedGiftName)}
              >
                Попробовать снова
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Gift list display */}
      {filteredGifts.length > 0 ? (
        <div className="space-y-4">
          <div className="gifts-grid">
            {filteredGifts.map((gift) => (
              <GiftCard
                key={`${gift.marketplace}-${gift.num}-${gift.message_id}`}
                gift={gift}
                onViewDetails={handleGiftDetails}
              />
            ))}
          </div>

          {/* Enhanced load more section */}
          {hasMoreData && (
            <div className="flex flex-col items-center mt-8 space-y-4">
              <div className="text-center">
                <p className="text-gray-300 text-sm mb-2">
                  Показано {filteredGifts.length} из {gifts.length} подарков
                </p>
                <div className="w-64 bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(filteredGifts.length / gifts.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <Button
                color="primary"
                variant="flat"
                onPress={handleLoadMore}
                isLoading={isSearching}
                size="lg"
                className="px-8"
              >
                Показать еще 50 подарков
              </Button>
            </div>
          )}
        </div>
      ) : selectedGiftName && !isSearching && gifts.length === 0 ? (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-300 text-lg">
              Подарки не найдены
            </p>
            <p className="text-gray-400 text-sm mt-2">
              По запросу &quot;{selectedGiftName}&quot; не найдено подарков на продаже на выбранных маркетплейсах
            </p>
            <Button
              color="primary"
              variant="flat"
              className="mt-4"
              onPress={() => setSelectedGiftName('')}
            >
              Выбрать другой подарок
            </Button>
          </CardBody>
        </Card>
      ) : selectedGiftName && !isSearching && filteredGifts.length === 0 && gifts.length > 0 ? (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="text-center py-12">
            <div className="text-6xl mb-4">🔽</div>
            <p className="text-gray-300 text-lg">
              Нет результатов после фильтрации
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Всего найдено {gifts.length} подарков &quot;{selectedGiftName}&quot;, но ни один не соответствует выбранным фильтрам
            </p>
            <Button
              color="secondary"
              variant="flat"
              className="mt-4"
              onPress={handleFiltersReset}
            >
              Сбросить фильтры
            </Button>
          </CardBody>
        </Card>
      ) : !selectedGiftName && !isSearching && (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="text-center py-12">
            <div className="text-6xl mb-4">🎁</div>
            <p className="text-gray-300 text-lg">
              Выберите подарок для начала поиска
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Выберите маркетплейс и название подарка из списка выше для поиска всех доступных экземпляров
            </p>
          </CardBody>
        </Card>
      )}

      {/* Enhanced gift details modal with marketplace information */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "bg-slate-800 text-white",
          header: "border-b border-slate-600",
          footer: "border-t border-slate-600"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
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
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{selectedGift.name}</h3>
                        <p className="text-gray-400">#{selectedGift.gift_num || selectedGift.num}</p>
                        <Chip size="sm" variant="flat" color="secondary" className="mt-1">
                          {selectedGift.marketplace}
                        </Chip>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Цена</p>
                        <p className="text-lg font-bold text-blue-400">
                          {selectedGift.price > 0 ? `${selectedGift.price} ${selectedGift.asset}` : 'Цена не указана'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Статус</p>
                        <Chip color="success" variant="flat">
                          {selectedGift.status === 'forsale' || selectedGift.status === 'listed' ? 'В продаже' : selectedGift.status}
                        </Chip>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-white">Характеристики:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Модель:</span>
                          <span className="text-white">{selectedGift.model || 'Не указано'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Фон:</span>
                          <span className="text-white">{selectedGift.backdrop || 'Не указано'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Символ:</span>
                          <span className="text-white">{selectedGift.symbol || 'Не указано'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Маркетплейс:</span>
                          <span className="text-white capitalize">{selectedGift.marketplace}</span>
                        </div>
                        {selectedGift.export_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Дата:</span>
                            <span className="text-white">{new Date(selectedGift.export_at).toLocaleDateString('ru-RU')}</span>
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
                <Button
                  color="primary"
                  onPress={() => {
                    if (selectedGift?.marketplaceUrl) {
                      window.open(selectedGift.marketplaceUrl, '_blank');
                    }
                    onClose();
                  }}
                >
                  Открыть на маркетплейсе
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}