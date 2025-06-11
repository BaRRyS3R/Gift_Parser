// src/app/page.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@nextui-org/react'
import { userService, type TelegramUser, type User } from '@/lib/supabase'

interface AuthState {
    isChecking: boolean
    isRegistering: boolean
    user: User | null
    telegramUser: TelegramUser | null
    error: string | null
    needsRegistration: boolean
}

export default function IntroPage() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)

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

    // Состояние видео (как в оригинале)
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

            const newUser = await userService.create(telegramUser)

            setAuthState(prev => ({
                ...prev,
                user: newUser,
                isRegistering: false,
                needsRegistration: false
            }))

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
    }, [])

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

            console.log('Проверяем существование пользователя в БД...')
            const existingUser = await checkUserExists(telegramUser)
            console.log('Результат проверки пользователя:', existingUser)

            if (existingUser) {
                console.log('Пользователь найден в базе данных, перенаправляем на /main')
                setAuthState(prev => ({
                    ...prev,
                    user: existingUser,
                    isChecking: false,
                    needsRegistration: false
                }))

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
    }, [getTelegramUser, checkUserExists, router])

    // Инициализация Service Worker и шрифта (как в оригинале)
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

    // Инициализация видео (как в оригинале)
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
                    .then(() => {
                        console.log('Регистрация успешна, перенаправляем на main')
                        // После успешной регистрации перенаправляем на main
                        setTimeout(() => {
                            router.push('/main')
                        }, 1000)
                    })
                    .catch(error => {
                        console.error('Ошибка регистрации после видео:', error)
                        // Даже при ошибке регистрации перенаправляем на main
                        setTimeout(() => {
                            router.push('/main')
                        }, 2000)
                    })
            } else if (currentAuthState.user) {
                console.log('Пользователь уже зарегистрирован, перенаправляем на main')
                // Если пользователь уже зарегистрирован, просто перенаправляем
                router.push('/main')
            } else {
                console.log('Условия для регистрации не выполнены, принудительно перенаправляем')
                console.log('Детали состояния:', currentAuthState)
                // Принудительно перенаправляем, если что-то пошло не так
                setTimeout(() => {
                    router.push('/main')
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
    }, [router, authState.user])

    // Инициализация авторизации
    useEffect(() => {
        if (!authInitializedRef.current) {
            initializeAuth()
        }
    }, [initializeAuth])

    // Функция запуска видео (оригинальная логика без регистрации)
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
            await registerUser(authState.telegramUser)
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
                        {authState.isChecking ? 'Проверка пользователя...' : `Загрузка... ${Math.round(loadProgress)}%`}
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
                        Повторить
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
                        Повторить
                    </button>
                    <button
                        onClick={handleQuickInit}
                        className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg font-bpdots text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors"
                    >
                        Продолжить без видео
                    </button>
                </div>
            )}

            {/* Экран регистрации */}
            {authState.needsRegistration && !authState.isChecking && !authState.error && !videoError && !isPlaying && (
                <div className="loader-container">
                    {authState.isRegistering ? (
                        <div className="text-center">
                            <Spinner size="lg" color="white" />
                            <p className="text-white mt-4 font-bpdots">Регистрация...</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold font-bpdots text-white mb-2">
                                    Добро пожаловать!
                                </h1>
                                <p className="text-gray-400 font-bpdots">
                                    {authState.telegramUser?.first_name}, выберите способ входа
                                </p>
                            </div>

                            {/* Кнопка init (как в оригинале) */}
                            {isReady && !isLoading && (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleStart}
                                        disabled={authState.isRegistering}
                                        className="block px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bpdots text-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        -init-/
                                    </button>

                                    <button
                                        onClick={handleQuickInit}
                                        disabled={authState.isRegistering}
                                        className="block px-6 py-3 bg-transparent border border-white/60 text-white/80 rounded-lg font-bpdots text-sm hover:bg-white/5 hover:border-white hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Быстрый вход (для слабых устройств)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Видео контейнер (как в оригинале) */}
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