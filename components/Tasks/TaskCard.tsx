// src/components/Tasks/TaskCard.tsx - Обновленный компонент карточки задания

"use client";

import React from "react";
import { Card, CardBody, Button } from "@nextui-org/react";
import { ExternalLink, Clock, CheckCircle, Gift, Timer } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface TaskCardProps {
    task: {
        id: string;
        type: string;
        title: string;
        description: string;
        reward: number;
        icon: string;
        action_url?: string;
        validation_type: 'manual' | 'automatic' | 'timer';
        status: 'available' | 'in_progress' | 'completed' | 'claimed';
        countdown?: number;
    };
    isProcessing: boolean;
    onAction: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isProcessing, onAction }) => {
    const t = useT();

    const getStatusIcon = () => {
        switch (task.status) {
            case "completed":
                return <Gift className="text-green-400" size={20} />;
            case "claimed":
                return <CheckCircle className="text-green-400" size={20} />;
            case "in_progress":
                return task.countdown !== undefined ?
                    <Timer className="text-yellow-400" size={20} /> :
                    <Clock className="text-yellow-400" size={20} />;
            default:
                return <div className="w-5 h-5 bg-white/20 rounded-full" />;
        }
    };

    const getStatusText = () => {
        switch (task.status) {
            case "completed":
                return t("tasks.status.completed");
            case "claimed":
                return t("tasks.status.claimed");
            case "in_progress":
                return task.countdown !== undefined ?
                    `${task.countdown}s` :
                    t("tasks.status.inProgress");
            default:
                return t("tasks.status.available");
        }
    };

    const getTaskButtonText = (taskType: string, status: string) => {
        if (isProcessing) {
            return t("common.loading");
        }

        switch (status) {
            case "completed":
                return t("tasks.rewards.claimReward");
            case "claimed":
                return t("tasks.rewards.rewardClaimed");
            case "in_progress":
                if (task.countdown !== undefined) {
                    return task.countdown > 0 ?
                        `Подтвердить через ${task.countdown}с` :
                        "Подтвердить выполнение";
                }
                return t("common.continue");
            default:
                // Кнопки для разных типов заданий
                switch (taskType) {
                    case "subscribe_channel":
                        return "Подписаться на канал";
                    case "join_chat":
                        return "Присоединиться к чату";
                    case "share_link":
                        return "Поделиться игрой";
                    case "post_story":
                        return "Опубликовать историю";
                    case "follow_social":
                        return "Подписаться";
                    case "visit_link":
                        return "Посетить сайт";
                    default:
                        return task.action_url ? "Открыть ссылку" : "Начать задание";
                }
        }
    };

    const getTaskInstructionText = (taskType: string) => {
        switch (taskType) {
            case "subscribe_channel":
                return "Пожалуйста, подпишитесь на канал и вернитесь для подтверждения";
            case "join_chat":
                return "Вступите в чат и вернитесь для подтверждения";
            case "share_link":
                return "Поделитесь игрой с друзьями и дождитесь подтверждения";
            case "post_story":
                return "Опубликуйте историю и дождитесь подтверждения";
            case "follow_social":
                return "Подпишитесь на аккаунт и дождитесь подтверждения";
            case "visit_link":
                return "Посетите сайт и дождитесь подтверждения";
            default:
                return "Выполните задание и дождитесь подтверждения";
        }
    };

    const getButtonColor = () => {
        switch (task.status) {
            case "completed":
                return "success";
            case "claimed":
                return "default";
            case "in_progress":
                return task.countdown === 0 ? "warning" : "default";
            default:
                return "primary";
        }
    };

    const isButtonDisabled = () => {
        if (isProcessing || task.status === "claimed") {
            return true;
        }

        // Для заданий с таймером блокируем кнопку пока идет отсчет
        if (task.status === "in_progress" && task.countdown !== undefined && task.countdown > 0) {
            return true;
        }

        return false;
    };

    const shouldShowInstructions = () => {
        return task.status === "in_progress" && task.countdown !== undefined;
    };

    return (
        <Card className="bg-white/5 border border-white/20 hover:bg-white/10 transition-colors">
            <CardBody className="p-4">
                {/* Заголовок задания с иконкой статуса */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white">
                                {task.title}
                            </h3>
                            <p className="text-white/60 text-sm">
                                {task.description}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {getStatusIcon()}
                        <span className="text-xs text-white/60 whitespace-nowrap">
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                {/* Индикатор типа валидации */}
                <div className="mb-3">
                    <div className="flex items-center space-x-2 text-xs text-white/50">
                        {task.validation_type === 'timer' && (
                            <>
                                <Timer size={12} />
                                <span>Автоматическая проверка</span>
                            </>
                        )}
                        {task.validation_type === 'manual' && (
                            <>
                                <CheckCircle size={12} />
                                <span>Ручная проверка</span>
                            </>
                        )}
                        {task.validation_type === 'automatic' && (
                            <>
                                <CheckCircle size={12} />
                                <span>Мгновенная проверка</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Инструкции для заданий в процессе выполнения */}
                {shouldShowInstructions() && (
                    <div className="mb-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <Timer className="text-yellow-300 flex-shrink-0" size={16} />
                            <p className="text-yellow-300 text-sm">
                                {getTaskInstructionText(task.type)}
                            </p>
                        </div>
                        {task.countdown !== undefined && task.countdown > 0 && (
                            <div className="mt-2">
                                <div className="text-yellow-200 text-xs">
                                    Подтверждение через: <span className="font-bold">{task.countdown}с</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Нижняя панель с наградой и кнопкой действия */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Gift className="text-green-400" size={16} />
                        <span className="text-green-400 font-bold">
                            {t("tasks.rewards.attempts", { count: task.reward })}
                        </span>
                    </div>

                    <Button
                        size="sm"
                        color={getButtonColor()}
                        isLoading={isProcessing}
                        isDisabled={isButtonDisabled()}
                        className={`
              ${task.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
              ${task.status === "claimed" ? "bg-gray-500 cursor-not-allowed opacity-50" : ""}
              ${task.status === "in_progress" && task.countdown === 0 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
            `}
                        startContent={
                            task.status === "available" && task.action_url ?
                                <ExternalLink size={16} /> : null
                        }
                        onPress={onAction}
                    >
                        {getTaskButtonText(task.type, task.status)}
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};

export default TaskCard;