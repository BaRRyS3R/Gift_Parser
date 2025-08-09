// src/app/mobile-only/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Smartphone, Monitor, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { getDeviceInfo, getAccessDenialReason, type DeviceInfo } from '@/utils/deviceDetection';

interface AccessDenialInfo {
    reason: string;
    title: string;
    description: string;
    icon: JSX.Element;
    color: string;
}

export default function MobileOnlyPage(): JSX.Element {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [denialReason, setDenialReason] = useState<string>('unknown');
    const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

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
                    title: 'Telegram Required',
                    description: 'This application can only be accessed through Telegram. Please open the app using a Telegram bot or direct link.',
                    icon: <AlertTriangle size={48} className="text-orange-400" />,
                    color: 'orange'
                };

            case 'not_mobile':
                return {
                    reason,
                    title: 'Mobile Device Required',
                    description: 'This application is designed exclusively for mobile devices. Desktop access is not supported.',
                    icon: <Monitor size={48} className="text-red-400" />,
                    color: 'red'
                };

            case 'desktop_telegram':
                return {
                    reason,
                    title: 'Mobile Telegram Required',
                    description: 'Please use Telegram on your mobile device instead of Telegram Desktop. This ensures the best experience and proper functionality.',
                    icon: <Smartphone size={48} className="text-blue-400" />,
                    color: 'blue'
                };

            case 'no_touch':
                return {
                    reason,
                    title: 'Touch Support Required',
                    description: 'This application requires touch input capabilities. Please use a mobile device with touch support.',
                    icon: <XCircle size={48} className="text-red-400" />,
                    color: 'red'
                };

            default:
                return {
                    reason,
                    title: 'Access Restricted',
                    description: 'This application is only available on mobile devices through Telegram.',
                    icon: <AlertTriangle size={48} className="text-gray-400" />,
                    color: 'gray'
                };
        }
    };

    const denialInfo = getDenialInfo(denialReason);

    const formatUserAgent = (ua: string): string => {
        if (ua.length > 80) {
            return ua.substring(0, 80) + '...';
        }
        return ua;
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8">
                {/* Main Alert */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        {denialInfo.icon}
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold text-white">
                            {denialInfo.title}
                        </h1>
                        <p className="text-gray-400 leading-relaxed">
                            {denialInfo.description}
                        </p>
                    </div>
                </div>

                {/* Access Instructions */}
                <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                        <Smartphone size={20} className="text-green-400" />
                        <h2 className="text-lg font-semibold text-white">How to Access</h2>
                    </div>

                    <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                        <li className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span>Open Telegram on your <strong>mobile device</strong> (iPhone or Android)</span>
                        </li>
                        <li className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span>Find our bot or tap the app link shared with you</span>
                        </li>
                        <li className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span>Launch the application directly within Telegram</span>
                        </li>
                    </ol>
                </div>

                {/* Device Status */}
                {deviceInfo && (
                    <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                        <div className="flex items-center space-x-2">
                            <Info size={20} className="text-blue-400" />
                            <h2 className="text-lg font-semibold text-white">Device Status</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Mobile Device</span>
                                <div className="flex items-center space-x-2">
                                    {deviceInfo.isMobile ? (
                                        <CheckCircle size={16} className="text-green-400" />
                                    ) : (
                                        <XCircle size={16} className="text-red-400" />
                                    )}
                                    <span className={deviceInfo.isMobile ? "text-green-400" : "text-red-400"}>
                                        {deviceInfo.isMobile ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Telegram</span>
                                <div className="flex items-center space-x-2">
                                    {deviceInfo.isTelegram ? (
                                        <CheckCircle size={16} className="text-green-400" />
                                    ) : (
                                        <XCircle size={16} className="text-red-400" />
                                    )}
                                    <span className={deviceInfo.isTelegram ? "text-green-400" : "text-red-400"}>
                                        {deviceInfo.isTelegram ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Touch Support</span>
                                <div className="flex items-center space-x-2">
                                    {deviceInfo.touchSupport ? (
                                        <CheckCircle size={16} className="text-green-400" />
                                    ) : (
                                        <XCircle size={16} className="text-red-400" />
                                    )}
                                    <span className={deviceInfo.touchSupport ? "text-green-400" : "text-red-400"}>
                                        {deviceInfo.touchSupport ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>

                            {deviceInfo.telegramPlatform && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Platform</span>
                                    <span className="text-white">{deviceInfo.telegramPlatform}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Debug Information Toggle */}
                <div className="text-center">
                    <button
                        onClick={() => setShowDebugInfo(!showDebugInfo)}
                        className="text-gray-500 hover:text-gray-400 text-sm underline"
                    >
                        {showDebugInfo ? 'Hide' : 'Show'} Technical Details
                    </button>
                </div>

                {/* Debug Information */}
                {showDebugInfo && deviceInfo && (
                    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-300">Technical Information</h3>
                        <div className="space-y-2 text-xs text-gray-400 font-mono">
                            <div>
                                <span className="text-gray-500">User Agent:</span>
                                <br />
                                <span className="break-all">{formatUserAgent(deviceInfo.userAgent)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Platform:</span> {deviceInfo.platform}
                            </div>
                            {deviceInfo.telegramPlatform && (
                                <div>
                                    <span className="text-gray-500">Telegram Platform:</span> {deviceInfo.telegramPlatform}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}