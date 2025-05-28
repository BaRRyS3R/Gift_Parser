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
  SelectItem
} from '@nextui-org/react';
import { Gift } from '@/types/gift';
import { apiService } from '@/services/apiService';
import GiftCard from '@/components/GiftCard';
import GiftFilters, { FilterOptions } from '@/components/GiftFilters';
import GiftImage from '@/components/GiftImage';

// Available gifts list
const AVAILABLE_GIFTS = {
  "5983471780763796287": "Santa Hat",
  "5936085638515261992": "Signet Ring",
  "5933671725160989227": "Precious Peach",
  "5936013938331222567": "Plush Pepe",
  "5913442287462908725": "Spiced Wine",
  "5915502858152706668": "Jelly Bunny",
  "5915521180483191380": "Durov's Cap",
  "5913517067138499193": "Perfume Bottle",
  "5882125812596999035": "Eternal Rose",
  "5882252952218894938": "Berry Box",
  "5857140566201991735": "Vintage Cigar",
  "5846226946928673709": "Magic Potion",
  "5845776576658015084": "Kissed Frog",
  "5825801628657124140": "Hex Pot",
  "5825480571261813595": "Evil Eye",
  "5841689550203650524": "Sharp Tongue",
  "5841391256135008713": "Trapped Heart",
  "5839038009193792264": "Skull Flower",
  "5837059369300132790": "Scared Cat",
  "5821261908354794038": "Spy Agaric",
  "5783075783622787539": "Homemade Cake",
  "5933531623327795414": "Genie Lamp",
  "6028426950047957932": "Lunar Snake",
  "6003643167683903930": "Party Sparkler",
  "5933590374185435592": "Jester Hat",
  "5821384757304362229": "Witch Hat",
  "5915733223018594841": "Hanging Star",
  "5915550639663874519": "Love Candle",
  "6001538689543439169": "Cookie Heart",
  "5782988952268964995": "Desk Calendar",
  "6001473264306619020": "Jingle Bells",
  "5980789805615678057": "Snow Mittens",
  "5836780359634649414": "Voodoo Doll",
  "5841632504448025405": "Mad Pumpkin",
  "5825895989088617224": "Hypno Lollipop",
  "5782984811920491178": "B-Day Candle",
  "5935936766358847989": "Bunny Muffin",
  "5933629604416717361": "Astral Shard",
  "5837063436634161765": "Flying Broom",
  "5841336413697606412": "Crystal Ball",
  "5821205665758053411": "Eternal Candle",
  "5936043693864651359": "Swiss Watch",
  "5983484377902875708": "Ginger Cookie",
  "5879737836550226478": "Mini Oscar",
  "5170594532177215681": "Lol Pop",
  "5843762284240831056": "Ion Gem",
  "5936017773737018241": "Star Notepad",
  "5868659926187901653": "Loot Bag",
  "5868348541058942091": "Love Potion",
  "5868220813026526561": "Toy Bear",
  "5868503709637411929": "Diamond Ring",
  "5167939598143193218": "Sakura Flower",
  "5981026247860290310": "Sleigh Bell",
  "5897593557492957738": "Top Hat",
  "5856973938650776169": "Record Player",
  "5983259145522906006": "Winter Wreath",
  "5981132629905245483": "Snow Globe",
  "5846192273657692751": "Electric Skull",
  "6023752243218481939": "Tama Gadget",
  "6003373314888696650": "Candy Cane",
  "5933793770951673155": "Neko Helmet",
  "6005659564635063386": "Jack-in-the-Box",
  "5773668482394620318": "Easter Egg",
  "5870661333703197240": "Bonded Ring",
  "6023917088358269866": "Pet Snake",
  "6023679164349940429": "Snake Box",
  "6003767644426076664": "Xmas Stocking",
  "6028283532500009446": "Big Year",
  "6003735372041814769": "Holiday Drink",
  "5859442703032386168": "Gem Signet",
  "5897581235231785485": "Light Sword",
  "5870784783948186838": "Restless Jar",
  "5870720080265871962": "Nail Bracelet",
  "5895328365971244193": "Heroic Helmet",
  "5895544372761461960": "Bow Tie"
};

export default function HomePage() {
  // State management
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedGiftName, setSelectedGiftName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalFoundGifts, setTotalFoundGifts] = useState(0);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Comprehensive gift search function
  const searchGiftsByName = useCallback(async (giftName: string) => {
    setIsSearching(true);
    setError(null);
    setGifts([]);
    setFilteredGifts([]);
    setTotalFoundGifts(0);
    setHasMoreData(true);

    try {
      console.log(`Starting comprehensive search for: ${giftName}`);

      const response = await apiService.searchGiftsByName(giftName);

      if (response.success && response.data) {
        const allGifts = response.data;

        if (allGifts.length === 0) {
          setError(`No gifts found for "${giftName}"`);
          setHasMoreData(false);
        } else {
          setGifts(allGifts);

          const initialDisplay = allGifts.slice(0, 50);
          setFilteredGifts(initialDisplay);
          setTotalFoundGifts(allGifts.length);
          setLastUpdate(new Date());

          setHasMoreData(allGifts.length > 50);

          console.log(`Successfully loaded ${allGifts.length} gifts for ${giftName}`);
        }
      } else {
        setError(response.error || 'Failed to search gifts');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching for gifts');
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  // Calculate statistics
  const calculateStatistics = useCallback(() => {
    if (gifts.length === 0) return null;

    const totalGifts = gifts.length;
    const displayedGifts = filteredGifts.length;
    const averagePrice = gifts.reduce((sum, gift) => sum + gift.price, 0) / totalGifts;
    const minPrice = Math.min(...gifts.map(gift => gift.price));
    const maxPrice = Math.max(...gifts.map(gift => gift.price));

    return {
      totalGifts,
      displayedGifts,
      averagePrice: averagePrice.toFixed(2),
      minPrice,
      maxPrice
    };
  }, [gifts, filteredGifts]);

  const stats = calculateStatistics();

  // Prepare gift options for select
  const giftOptions = Object.entries(AVAILABLE_GIFTS).map(([id, name]) => ({
    key: name,
    label: name
  })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      {/* Enhanced loading indicator */}
      {isSearching && (
        <div className="fixed top-6 right-6 bg-blue-500/90 text-white px-6 py-3 rounded-lg text-sm font-medium shadow-lg z-50 flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="flex flex-col">
            <span>Загрузка всех доступных подарков...</span>
            <span className="text-xs opacity-80">Это может занять несколько секунд</span>
          </div>
        </div>
      )}

      {/* Gift selection card */}
      <Card className="bg-slate-800 border-slate-600">
        <CardBody className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Выберите подарок для поиска</h2>
              <p className="text-gray-300 text-sm">
                Выберите название подарка из списка для поиска всех доступных экземпляров на маркетплейсе Tonnel
              </p>
            </div>

            <Select
              placeholder="Выберите подарок для поиска"
              className="max-w-md"
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
        </CardBody>
      </Card>

      {/* Enhanced results summary */}
      {selectedGiftName && (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="p-4">
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
          </CardBody>
        </Card>
      )}

      {/* Enhanced comprehensive statistics */}
      {stats && (
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
                key={`${gift.num}-${gift.message_id}`}
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
              По запросу &quot;{selectedGiftName}&quot; не найдено подарков на продаже в маркетплейсе Tonnel
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
              Выберите название подарка из списка выше для поиска всех доступных экземпляров
            </p>
          </CardBody>
        </Card>
      )}

      {/* Gift details modal */}
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
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedGift.name}</h3>
                        <p className="text-gray-400">#{selectedGift.gift_num || selectedGift.num}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Цена</p>
                        <p className="text-lg font-bold text-blue-400">
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
                      <h4 className="font-semibold text-white">Характеристики:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Модель:</span>
                          <span className="text-white">{selectedGift.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Фон:</span>
                          <span className="text-white">{selectedGift.backdrop}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Символ:</span>
                          <span className="text-white">{selectedGift.symbol}</span>
                        </div>
                        {selectedGift.export_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Дата экспорта:</span>
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