// src/app/page.tsx

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@nextui-org/react'
import { Play, Zap, Wifi, WifiOff } from 'lucide-react'
import { userService, type TelegramUser, type User } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

interface AuthState {
    isChecking: boolean
    isRegistering: boolean
    user: User | null
    telegramUser: TelegramUser | null
    error: string | null
    needsRegistration: boolean
}

export default function IntroPage(): JSX.Element {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const { refreshUser, updateUser, setTelegramUser } = useUser()

    // Флаги для предотвращения повторных операций
    const authInitializedRef = useRef<boolean>(false)
    const registrationInProgressRef = useRef<boolean>(false)

    // Состояние авторизации
    const [authState, setAuthState] = useState<AuthState>({
        isChecking: true,
        isRegistering: false,
        user: null,
        telegramUser: null,
        error: null,
        needsRegistration: false
    })

    // Ref для хранения актуального состояния авторизации
    const authStateRef = useRef<AuthState>(authState)

    // Обновляем ref при изменении состояния
    useEffect(() => {
        authStateRef.current = authState
    }, [authState])

    // Состояние видео
    const [isLoading, setIsLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState(0)
    const [fontLoaded, setFontLoaded] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    const getTelegramUser = useCallback((): TelegramUser | null => {
        if (typeof window === 'undefined') {
            return null
        }

        // Проверяем наличие Telegram WebApp API
        if (!window.Telegram?.WebApp) {
            console.log('Telegram WebApp API недоступен')
            // Для тестирования вне Telegram возвращаем тестового пользователя
            if (process.env.NODE_ENV === 'development') {
                console.log('Возвращаем тестового пользователя для разработки')
                return {
                    id: 430743609,
                    first_name: 'Test User',
                    last_name: 'Developer',
                    username: 'testuser',
                    language_code: 'en',
                    is_premium: false
                }
            }
            return null
        }

        const tg = window.Telegram.WebApp
        const user = tg.initDataUnsafe?.user

        console.log('Данные Telegram пользователя:', user)

        if (!user || !user.id) {
            console.log('Пользователь Telegram не найден или некорректен')
            // Для тестирования возвращаем тестового пользователя
            if (process.env.NODE_ENV === 'development') {
                return {
                    id: 430743609,
                    first_name: 'Test User',
                    last_name: 'Developer',
                    username: 'testuser',
                    language_code: 'en',
                    is_premium: false
                }
            }
            return null
        }

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium
        }
    }, [])

    const checkUserExists = useCallback(async (telegramUser: TelegramUser): Promise<User | null> => {
        try {
            return await userService.findByTelegramId(telegramUser.id)
        } catch (error) {
            console.error('Ошибка при проверке пользователя:', error)
            throw error
        }
    }, [])

    const registerUser = useCallback(async (telegramUser: TelegramUser): Promise<User> => {
        if (registrationInProgressRef.current) {
            throw new Error('Регистрация уже в процессе')
        }

        try {
            registrationInProgressRef.current = true

            setAuthState(prev => ({
                ...prev,
                isRegistering: true,
                error: null
            }))

            console.log('Создаем нового пользователя в БД...')
            const newUser = await userService.create(telegramUser)
            console.log('Пользователь успешно создан:', newUser)

            // Обновляем локальное состояние
            setAuthState(prev => ({
                ...prev,
                user: newUser,
                isRegistering: false,
                needsRegistration: false
            }))

            // КРИТИЧНО: Обновляем контекст приложения
            console.log('Обновляем контекст пользователя...')
            updateUser(newUser)

            return newUser
        } catch (error) {
            console.error('Ошибка при регистрации:', error)
            setAuthState(prev => ({
                ...prev,
                isRegistering: false,
                error: 'Ошибка при регистрации пользователя'
            }))
            throw error
        } finally {
            registrationInProgressRef.current = false
        }
    }, [updateUser])

    const initializeAuth = useCallback(async () => {
        if (authInitializedRef.current) return

        authInitializedRef.current = true

        try {
            console.log('Инициализация авторизации...')

            const telegramUser = getTelegramUser()
            console.log('Полученный пользователь Telegram:', telegramUser)

            if (!telegramUser) {
                console.error('Данные пользователя Telegram недоступны')
                setAuthState(prev => ({
                    ...prev,
                    isChecking: false,
                    error: 'Данные пользователя Telegram недоступны'
                }))
                return
            }

            setAuthState(prev => ({ ...prev, telegramUser }))

            // Устанавливаем telegram пользователя в контекст
            setTelegramUser(telegramUser)

            console.log('Проверяем существование пользователя в БД...')
            const existingUser = await checkUserExists(telegramUser)
            console.log('Результат проверки пользователя:', existingUser)

            if (existingUser) {
                console.log('Пользователь найден в базе данных, обновляем контекст и перенаправляем на /main')
                setAuthState(prev => ({
                    ...prev,
                    user: existingUser,
                    isChecking: false,
                    needsRegistration: false
                }))

                // Обновляем контекст для существующего пользователя
                updateUser(existingUser)

                setTimeout(() => {
                    router.push('/main')
                }, 500)
            } else {
                console.log('Пользователь не найден в БД, требуется регистрация')
                setAuthState(prev => ({
                    ...prev,
                    isChecking: false,
                    needsRegistration: true
                }))
            }
        } catch (error) {
            console.error('Ошибка инициализации авторизации:', error)
            setAuthState(prev => ({
                ...prev,
                isChecking: false,
                error: `Ошибка подключения к базе данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            }))
        }
    }, [getTelegramUser, checkUserExists, router, updateUser, setTelegramUser])

    // Инициализация Service Worker и шрифта
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker зарегистрирован'))
                .catch(err => console.error('ServiceWorker регистрация не удалась:', err))
        }

        if ('fonts' in document) {
            document.fonts.load('1rem "BPDots Diamond"')
                .then(() => setFontLoaded(true))
                .catch(() => setFontLoaded(true))
        } else {
            setTimeout(() => setFontLoaded(true), 1000)
        }
    }, [])

    // Инициализация видео
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleLoadedMetadata = () => {
            video.volume = 1
            setIsReady(true)
        }

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                const duration = video.duration
                if (duration > 0) {
                    const progress = (bufferedEnd / duration) * 100
                    setLoadProgress(progress)
                }
            }
        }

        const handleCanPlayThrough = () => {
            setIsLoading(false)
        }

        const handleEnded = () => {
            console.log('Видео завершено')

            // Используем актуальное состояние из ref
            const currentAuthState = authStateRef.current

            console.log('Актуальное состояние авторизации:', {
                telegramUser: !!currentAuthState.telegramUser,
                user: !!currentAuthState.user,
                isRegistering: currentAuthState.isRegistering,
                needsRegistration: currentAuthState.needsRegistration
            })

            // Выполняем регистрацию пользователя после окончания видео
            if (currentAuthState.telegramUser && !currentAuthState.user && !currentAuthState.isRegistering) {
                console.log('Начинаем регистрацию после видео')
                registerUser(currentAuthState.telegramUser)
                    .then((registeredUser) => {
                        console.log('Регистрация успешна, пользователь:', registeredUser)
                        console.log('Перенаправляем на main через 1 секунду')
                        // После успешной регистрации перенаправляем на main
                        setTimeout(() => {
                            router.push('/main')
                        }, 1000)
                    })
                    .catch(error => {
                        console.error('Ошибка регистрации после видео:', error)
                        // Даже при ошибке регистрации пытаемся обновить контекст
                        setTimeout(() => {
                            refreshUser().then(() => {
                                router.push('/main')
                            }).catch(() => {
                                router.push('/main')
                            })
                        }, 2000)
                    })
            } else if (currentAuthState.user) {
                console.log('Пользователь уже зарегистрирован, перенаправляем на main')
                // Если пользователь уже зарегистрирован, просто перенаправляем
                router.push('/main')
            } else {
                console.log('Условия для регистрации не выполнены, принудительно перенаправляем')
                console.log('Детали состояния:', currentAuthState)
                // Принудительно обновляем контекст и перенаправляем
                setTimeout(() => {
                    refreshUser().then(() => {
                        router.push('/main')
                    }).catch(() => {
                        router.push('/main')
                    })
                }, 1000)
            }
        }

        const handleError = (e: Event) => {
            console.error('Video error:', e)
            setVideoError('Failed to load video. Please try again.')
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('progress', handleProgress)
        video.addEventListener('canplaythrough', handleCanPlayThrough)
        video.addEventListener('ended', handleEnded)
        video.addEventListener('error', handleError)

        video.load()

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('progress', handleProgress)
            video.removeEventListener('canplaythrough', handleCanPlayThrough)
            video.removeEventListener('ended', handleEnded)
            video.removeEventListener('error', handleError)
        }
    }, [router, registerUser, refreshUser])

    // Инициализация авторизации
    useEffect(() => {
        if (!authInitializedRef.current) {
            initializeAuth()
        }
    }, [initializeAuth])

    // Функция запуска видео
    const handleStart = async () => {
        const video = videoRef.current
        if (!video) return

        try {
            video.currentTime = 0
            await video.play()
            setIsPlaying(true)
            setVideoError(null)
        } catch (err) {
            console.error('Video play error:', err)
            setVideoError('Failed to play video. Please try again.')
        }
    }

    // Быстрая регистрация без видео
    const handleQuickInit = async () => {
        if (!authState.telegramUser || authState.isRegistering || registrationInProgressRef.current) {
            return
        }

        try {
            const registeredUser = await registerUser(authState.telegramUser)
            console.log('Быстрая регистрация успешна:', registeredUser)
            setTimeout(() => {
                router.push('/main')
            }, 1000)
        } catch (error) {
            console.error('Ошибка быстрой регистрации:', error)
        }
    }

    const isInitialLoading = authState.isChecking || (isLoading && !videoError) || !fontLoaded

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Экран загрузки */}
            {isInitialLoading && (
                <div className="loader-container">
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${loadProgress}%` }}
                        />
                    </div>
                    <p className="text-white mt-4 text-sm font-bpdots">
                        {authState.isChecking ? 'Checking user...' : `Loading... ${Math.round(loadProgress)}%`}
                    </p>
                </div>
            )}

            {/* Экран ошибки авторизации */}
            {authState.error && !isInitialLoading && (
                <div className="loader-container">
                    <p className="text-white text-center font-bpdots mb-4">{authState.error}</p>
                    <button
                        onClick={() => {
                            authInitializedRef.current = false
                            registrationInProgressRef.current = false
                            setAuthState(prev => ({ ...prev, error: null, isChecking: true }))
                            initializeAuth()
                        }}
                        className="px-4 py-2 bg-white text-black rounded font-bpdots"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Экран ошибки видео */}
            {videoError && !isInitialLoading && !authState.error && (
                <div className="loader-container">
                    <p className="text-white text-center font-bpdots mb-4">{videoError}</p>
                    <button
                        onClick={handleStart}
                        className="px-4 py-2 bg-white text-black rounded font-bpdots mb-4"
                    >
                        Retry
                    </button>
                    <button
                        onClick={handleQuickInit}
                        className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg font-bpdots text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
                    >
                        Continue without video
                    </button>
                </div>
            )}

            {/* Экран регистрации */}
            {authState.needsRegistration && !authState.isChecking && !authState.error && !videoError && !isPlaying && (
                <div className="min-h-screen bg-black flex items-center justify-center p-6 fixed inset-0 z-50">
                    <div className="w-full max-w-md space-y-8">
                        {authState.isRegistering ? (
                            <div className="text-center">
                                <Spinner size="lg" color="white" />
                                <p className="text-white mt-4 font-bpdots">Registering...</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-8">
                                {/* Header */}
                                <div className="space-y-4">
                                    <div className="relative">
                                        <h1 className="text-4xl font-bold font-bpdots text-white tracking-wider">
                                            WELCOME
                                        </h1>
                                        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                                    </div>
                                    <p className="text-white/70 font-bpdots text-sm">
                                        Hello, <span className="text-white font-bold">{authState.telegramUser?.first_name}</span>
                                    </p>
                                    <p className="text-white/50 font-bpdots text-xs uppercase tracking-widest">
                                        Choose your entry method
                                    </p>
                                </div>

                                {/* Debug info - временно для отладки */}
                                <div className="text-xs text-white/50 font-bpdots mb-4 bg-red-500/20 p-2 rounded">
                                    Debug: isReady={isReady.toString()}, isLoading={isLoading.toString()},
                                    isRegistering={authState.isRegistering.toString()},
                                    hasUser={!!authState.telegramUser}
                                </div>

                                {/* Buttons */}
                                <div className="space-y-6">
                                    {/* Main Button - With Intro */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                console.log('INITIALIZE button clicked!');
                                                handleStart();
                                            }}
                                            disabled={authState.isRegistering}
                                            className="group relative w-full px-8 py-6 bg-transparent border-2 border-white/60 text-white rounded-2xl font-bpdots text-xl font-bold hover:border-white hover:bg-white/5 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ pointerEvents: 'auto', zIndex: 100 }}
                                        >
                                            <div className="flex items-center justify-center space-x-4">
                                                <div className="relative">
                                                    <Play size={24} className="text-white group-hover:translate-x-1 transition-transform duration-300" />
                                                    <Wifi size={16} className="absolute -top-2 -right-2 text-white/60" />
                                                </div>
                                                <span className="tracking-wider">INITIALIZE</span>
                                            </div>

                                            {/* Glow effect */}
                                            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        </button>

                                        <div className="text-center space-y-1">
                                            <p className="text-white/60 font-bpdots text-sm">
                                                Full experience with intro video
                                            </p>
                                            <p className="text-white/40 font-bpdots text-xs">
                                                Recommended for first-time users
                                            </p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-white/20"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-black px-4 text-white/40 font-bpdots text-xs uppercase">or</span>
                                        </div>
                                    </div>

                                    {/* Alternative Button - Quick Mode */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                console.log('QUICK START button clicked!');
                                                handleQuickInit();
                                            }}
                                            disabled={authState.isRegistering}
                                            className="group relative w-full px-6 py-4 bg-transparent border border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ pointerEvents: 'auto', zIndex: 100 }}
                                        >
                                            <div className="flex items-center justify-center space-x-3">
                                                <div className="relative">
                                                    <Zap size={20} className="text-white/70 group-hover:text-white transition-colors duration-300" />
                                                    <WifiOff size={12} className="absolute -top-1 -right-1 text-white/50" />
                                                </div>
                                                <span>QUICK START</span>
                                            </div>
                                        </button>

                                        <div className="text-center space-y-1">
                                            <p className="text-white/50 font-bpdots text-sm">
                                                Skip intro • Potato mode
                                            </p>
                                            <p className="text-white/30 font-bpdots text-xs">
                                                For slow connections & impatient users 🥔
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Видео контейнер */}
            <div className={`video-container ${isPlaying ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    ref={videoRef}
                    className="video-player"
                    playsInline
                    preload="auto"
                >
                    <source src="/videos/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    )
}