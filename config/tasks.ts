// src/config/tasks.ts - Конфигурация заданий

export type TaskType = 'channel' | 'chat' | 'twitter' | 'website' | 'story';

export interface Task {
  id: string;
  type: TaskType;
  title: string; // Название ресурса (канала, сайта и т.д.)
  description: string; // Описание задания
  url: string;
  reward: number; // Количество попыток в награду
  icon: string; // Имя иконки или emoji
  color: string; // Цвет для UI
  cooldown?: number; // Кулдаун в миллисекундах (только для story)
}

export const TASKS: Task[] = [
  // Каналы
  {
    id: 'join_news_channel',
    type: 'channel',
    title: 'Facets',
    description: 'Channel',
    url: 'https://t.me/thefacets',
    reward: 5,
    icon: '📢',
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'join_updates_channel',
    type: 'channel',
    title: 'Facets Channel 2',
    description: 'Updates Channel',
    url: 'https://t.me/thefacets',
    reward: 3,
    icon: '🔔',
    color: 'from-purple-500/20 to-pink-500/20'
  },

  // Чаты
  {
    id: 'join_community_chat',
    type: 'chat',
    title: 'Chat',
    description: 'Test Chat',
    url: 'https://t.me/thefacets_chat',
    reward: 4,
    icon: '💬',
    color: 'from-green-500/20 to-emerald-500/20'
  },

  // Twitter
  {
    id: 'follow_twitter',
    type: 'twitter',
    title: '@YourGameOfficial',
    description: 'Twitter Follow',
    url: 'https://twitter.com/your_account',
    reward: 3,
    icon: '🐦',
    color: 'from-sky-500/20 to-blue-500/20'
  },
  {
    id: 'retweet_post',
    type: 'twitter',
    title: 'Twitter Repost',
    description: 'Twitter Desc',
    url: 'https://twitter.com/your_account/status/123456789',
    reward: 2,
    icon: '🔄',
    color: 'from-sky-500/20 to-blue-500/20'
  },

  // Веб-сайты
  {
    id: 'visit_website',
    type: 'website',
    title: 'NOTFREN',
    description: 'Blackhole',
    url: 'https://notfren.com',
    reward: 2,
    icon: '🌐',
    color: 'from-orange-500/20 to-red-500/20'
  },

  // Сторис
  {
    id: 'share_story',
    type: 'story',
    title: 'Test Storys',
    description: 'Share in telegram',
    url: '/videos/mainbg.mp4', // Путь к видео для сторис
    reward: 10,
    icon: '📸',
    color: 'from-yellow-500/20 to-orange-500/20',
    cooldown: 2 * 60 * 1000 // 2 минуты
  }
];

// Получение задания по ID
export const getTaskById = (id: string): Task | undefined => {
  return TASKS.find(task => task.id === id);
};

// Получение заданий по типу
export const getTasksByType = (type: TaskType): Task[] => {
  return TASKS.filter(task => task.type === type);
};

// Получение иконки для типа задания
export const getTaskTypeIcon = (type: TaskType): string => {
  switch (type) {
    case 'channel': return '📢';
    case 'chat': return '💬';
    case 'twitter': return '🐦';
    case 'website': return '🌐';
    case 'story': return '📸';
    default: return '📋';
  }
};

// Получение названия типа задания
export const getTaskTypeName = (type: TaskType): string => {
  switch (type) {
    case 'channel': return 'Channel';
    case 'chat': return 'Chat';
    case 'twitter': return 'Twitter';
    case 'website': return 'Website';
    case 'story': return 'Story';
    default: return 'Task';
  }
};