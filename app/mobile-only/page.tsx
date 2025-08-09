// src/app/mobile-only/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Smartphone, ExternalLink, MessageCircle, Users, Bot } from 'lucide-react';
import { getDeviceInfo, getAccessDenialReason, type DeviceInfo } from '@/utils/deviceDetection';

interface AccessDenialInfo {
    reason: string;
    title: string;
    description: string;
    icon: JSX.Element;
}

export default function MobileOnlyPage(): JSX.Element {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [denialReason, setDenialReason] = useState<string>('unknown');

    useEffect(() => {
        const info = getDeviceInfo();
        const reason = getAccessDenialReason();
        setDeviceInfo(info);
        setDenialReason(reason);
    }, []);

    const getDenialInfo = (reason: string): AccessDenialInfo => {
        switch (reason) {
            case 'not_telegram':
                return {
                    reason,
                    title: 'Access via Telegram Required',
                    description: 'This application is exclusively available through Telegram. Please access it using our official bot or channel links below.',
                    icon: <Bot size={64} className="text-blue-400" />
                };

            case 'not_mobile':
            case 'telegram_desktop':
                return {
                    reason,
                    title: 'Mobile Device Required',
                    description: 'Our application is optimized for mobile experiences. Please access it through Telegram on your mobile device for the best performance and functionality.',
                    icon: <Smartphone size={64} className="text-cyan-400" />
                };

            case 'telegram_web':
                return {
                    reason,
                    title: 'Mobile Telegram Required',
                    description: 'For optimal security and performance, please use the Telegram mobile app instead of the web version. Download Telegram on your mobile device and access our bot.',
                    icon: <Smartphone size={64} className="text-purple-400" />
                };

            default:
                return {
                    reason,
                    title: 'Mobile Access Only',
                    description: 'This application is designed exclusively for mobile devices through Telegram. Please access it using your mobile phone.',
                    icon: <Smartphone size={64} className="text-emerald-400" />
                };
        }
    };

    const denialInfo = getDenialInfo(denialReason);

    const links = [
        {
            icon: <Bot size={24} className="text-blue-400" />,
            title: "Open Bot",
            description: "Start using Circusle",
            url: "https://t.me/circusle_bot",
            gradient: "from-blue-500/20 to-cyan-500/20",
            border: "border-blue-400/30",
            hover: "hover:border-blue-400/60 hover:shadow-blue-400/20"
        },
        {
            icon: <Users size={24} className="text-purple-400" />,
            title: "Join Channel",
            description: "Latest updates & news",
            url: "https://t.me/Circusle",
            gradient: "from-purple-500/20 to-pink-500/20",
            border: "border-purple-400/30",
            hover: "hover:border-purple-400/60 hover:shadow-purple-400/20"
        },
        {
            icon: <MessageCircle size={24} className="text-emerald-400" />,
            title: "Support Chat",
            description: "Get help & assistance",
            url: "https://t.me/Circusle_chat",
            gradient: "from-emerald-500/20 to-teal-500/20",
            border: "border-emerald-400/30",
            hover: "hover:border-emerald-400/60 hover:shadow-emerald-400/20"
        }
    ];

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-8">

                    {/* Main Alert Section */}
                    <div className="text-center space-y-6">
                        <div className="relative">
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-xl"></div>
                                    <div className="relative bg-black/50 backdrop-blur-sm border border-cyan-400/30 rounded-full p-6">
                                        {denialInfo.icon}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                                    {denialInfo.title}
                                </h1>
                                <p className="text-gray-300 leading-relaxed text-lg">
                                    {denialInfo.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Links */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
                            Access Circusle
                        </h2>

                        {links.map((link, index) => (
                            <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`group relative block p-6 rounded-2xl bg-gradient-to-r ${link.gradient} border ${link.border} ${link.hover} transition-all duration-300 hover:shadow-lg backdrop-blur-sm`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-lg blur"></div>
                                            <div className="relative bg-black/30 backdrop-blur-sm rounded-lg p-3">
                                                {link.icon}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-lg font-semibold text-white">
                                                {link.title}
                                            </h3>
                                            <ExternalLink size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            {link.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* Footer Message */}
                    <div className="text-center pt-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent h-px"></div>
                            <p className="text-gray-500 text-sm bg-black px-4 relative">
                                Experience Circusle on your mobile device
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Floating Particles Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full animate-float-gentle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
}