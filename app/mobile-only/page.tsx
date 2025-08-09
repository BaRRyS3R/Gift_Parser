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
                    icon: <Bot size={48} className="text-white" />
                };

            case 'not_mobile':
            case 'telegram_desktop':
                return {
                    reason,
                    title: 'Mobile Device Required',
                    description: 'Our application is optimized for mobile experiences. Please access it through Telegram on your mobile device for the best performance and functionality.',
                    icon: <Smartphone size={48} className="text-white" />
                };

            case 'telegram_web':
                return {
                    reason,
                    title: 'Mobile Telegram Required',
                    description: 'For optimal security and performance, please use the Telegram mobile app instead of the web version. Download Telegram on your mobile device and access our bot.',
                    icon: <Smartphone size={48} className="text-white" />
                };

            default:
                return {
                    reason,
                    title: 'Mobile Access Only',
                    description: 'This application is designed exclusively for mobile devices through Telegram. Please access it using your mobile phone.',
                    icon: <Smartphone size={48} className="text-white" />
                };
        }
    };

    const denialInfo = getDenialInfo(denialReason);

    const links = [
        {
            icon: <Bot size={20} className="text-white" />,
            title: "Open Bot",
            description: "Start using Circusle",
            url: "https://t.me/circusle_bot"
        },
        {
            icon: <Users size={20} className="text-white" />,
            title: "Join Channel",
            description: "Latest updates & news",
            url: "https://t.me/Circusle"
        },
        {
            icon: <MessageCircle size={20} className="text-white" />,
            title: "Support Chat",
            description: "Get help & assistance",
            url: "https://t.me/Circusle_chat"
        }
    ];

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-12">

                {/* Main Alert Section */}
                <div className="text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="border border-white/20 rounded-lg p-6 bg-white/5">
                            {denialInfo.icon}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-2xl font-bold text-white tracking-wide">
                            {denialInfo.title}
                        </h1>
                        <p className="text-gray-400 leading-relaxed">
                            {denialInfo.description}
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <div className="px-4 text-white/60 text-sm font-medium">
                        CIRCUSLE
                    </div>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Action Links */}
                <div className="space-y-4">
                    {links.map((link, index) => (
                        <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block p-4 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0 border border-white/20 rounded p-2">
                                    {link.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-white font-medium">
                                                {link.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {link.description}
                                            </p>
                                        </div>
                                        <ExternalLink
                                            size={16}
                                            className="text-gray-400 group-hover:text-white transition-colors flex-shrink-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center pt-8">
                    <p className="text-gray-500 text-sm">
                        Play Circusle on your mobile device.
                    </p>
                </div>

            </div>
        </div>
    );
}