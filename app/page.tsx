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

// Список доступных подарков
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
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [filteredGifts, setFilteredGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedGiftName, setSelectedGiftName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalFoundGifts, setTotalFoundGifts] = useState(0);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Загрузка подарков по выбранному названию
  const searchGiftsByName = useCallback(async (giftName: string, page: number = 1, append: boolean = false) => {
    const isInitialLoad = page === 1 && !append;

    if (isInitialLoad) {
      setIsSearching(true);
      setError(null);
      setGifts([]);
      setFilteredGifts([]);
      setTotalFoundGifts(0);
    }

    try {
      let response;

      if (page === 1 && !append) {
        // Use the corrected search method for initial load
        response = await apiService.searchGiftsByName(giftName);
      } else {
        // For pagination, use the correct filter format
        const searchFilter = {
          price: { $exists: true },
          buyer: { $exists: false },
          gift_name: giftName,
          asset: "TON"
        };

        response = await apiService.getPageGifts({
          page,
          limit: 30, // Use API-approved limit
          sort: '{"message_post_time":-1,"gift_id":-1}',
          filter: JSON.stringify(searchFilter),
          ref: 0,
          price_range: null,
          user_auth: ''
        });
      }

      if (response.success && response.data) {
        const newGifts = response.data;

        if (newGifts.length === 0) {
          setHasMoreData(false);
          if (isInitialLoad) {
            setError(`No gifts found for "${giftName}"`);
          }
        } else {
          setGifts(prevGifts => append ? [...prevGifts, ...newGifts] : newGifts);
          setFilteredGifts(prevGifts => append ? [...prevGifts, ...newGifts] : newGifts);
          setLastUpdate(new Date());

          if (isInitialLoad) {
            setTotalFoundGifts(newGifts.length);
          }

          // Check if we have more data available
          setHasMoreData(newGifts.length === 30);
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

  // Применение фильтров
  const applyFilters = useCallback((filters: FilterOptions) => {
    let filtered = [...gifts];

    // Фильтр по цене
    filtered = filtered.filter(gift =>
      gift.price >= filters.priceRange[0] && gift.price <= filters.priceRange[1]
    );

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

  const handleGiftNameSelect = (giftName: string) => {
    setSelectedGiftName(giftName);
    setCurrentPage(1);
    setHasMoreData(true);
    searchGiftsByName(giftName, 1, false);
  };

  const handleLoadMore = () => {
    if (!isSearching && hasMoreData && selectedGiftName) {
      searchGiftsByName(selectedGiftName, currentPage + 1, true);
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
    const minPrice = Math.min(...filteredGifts.map(gift => gift.price));
    const maxPrice = Math.max(...filteredGifts.map(gift => gift.price));

    return {
      totalGifts,
      averagePrice: averagePrice.toFixed(2),
      minPrice,
      maxPrice
    };
  };

  const stats = calculateStatistics();

  // Подготовка опций для селекта
  const giftOptions = Object.entries(AVAILABLE_GIFTS).map(([id, name]) => ({
    key: name,
    label: name
  })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      {/* Индикатор поиска */}
      {isSearching && (
        <div className="fixed top-6 right-6 bg-yellow-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          Поиск подарков...
        </div>
      )}

      {/* Выбор подарка */}
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

      {/* Результаты поиска */}
      {selectedGiftName && (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Результаты поиска: {selectedGiftName}
                </h3>
                <p className="text-gray-300 text-sm">
                  {totalFoundGifts > 0 && `Найдено ${totalFoundGifts} подарков на продаже`}
                  {filteredGifts.length !== totalFoundGifts && ` • Показано ${filteredGifts.length} после фильтрации`}
                </p>
              </div>
              {lastUpdate && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">
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

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-600">
            <CardBody className="text-center p-4">
              <p className="text-2xl font-bold text-blue-400">{stats.totalGifts}</p>
              <p className="text-sm text-gray-300">Показано подарков</p>
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
              <p className="text-2xl font-bold text-purple-400">{stats.minPrice}</p>
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

      {/* Фильтры - показываем только если есть результаты поиска */}
      {gifts.length > 0 && (
        <GiftFilters
          onFiltersChange={applyFilters}
          onReset={handleFiltersReset}
          gifts={gifts}
          isLoading={isSearching}
        />
      )}

      {/* Ошибка */}
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
                isLoading={isSearching}
                size="lg"
              >
                Загрузить еще подарки
              </Button>
            </div>
          )}
        </div>
      ) : selectedGiftName && !isSearching && (
        <Card className="bg-slate-800 border-slate-600">
          <CardBody className="text-center py-12">
            <p className="text-gray-300 text-lg">
              Подарки не найдены
            </p>
            <p className="text-gray-400 text-sm mt-2">
              По запросу &quot;{selectedGiftName}&quot; не найдено подарков на продаже
            </p>
          </CardBody>
        </Card>
      )}

      {/* Приглашение к выбору */}
      {!selectedGiftName && !isSearching && (
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

      {/* Модальное окно с деталями подарка */}
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