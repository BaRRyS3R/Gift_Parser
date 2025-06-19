// src/components/Tasks/TaskCard.tsx - Компонент карточки задания

"use client";

import React from "react";
import { Card, CardBody, Button } from "@nextui-org/react";
import { ExternalLink, Clock, CheckCircle, Gift } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import type { Task } from "@/types/tasks";

interface TaskCardProps {
    task: Task;
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
                return <Clock className="text-yellow-400" size={20} />;
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
                return t("tasks.status.inProgress");
            default:
                return t("tasks.status.available");
        }
    };

    const getTaskKey = (suffix: string) => {
        const taskTypeMap: Record<string, string> = {
            'subscribe_channel': 'subscribeChannel',
            'share_link': 'shareLink',
            'post_story': 'postStory'
        };
        const camelCaseType = taskTypeMap[task.type] || task.type;
        return `tasks.${camelCaseType}.${suffix}` as any;
    };

    const getButtonText = () => {
        if (isProcessing) {
            return t("common.loading");
        }

        switch (task.status) {
            case "completed":
                return t("tasks.rewards.claimReward");
            case "claimed":
                return t("tasks.rewards.rewardClaimed");
            case "in_progress":
                if ((task as any).countdown) {
                    return t(getTaskKey("countdown"), { seconds: (task as any).countdown });
                }
                return t(getTaskKey("verify"));
            default:
                return t(getTaskKey("button"));
        }
    };

    const getButtonColor = () => {
        switch (task.status) {
            case "completed":
                return "success";
            case "claimed":
                return "default";
            case "in_progress":
                return "warning";
            default:
                return "primary";
        }
    };

    const isButtonDisabled = () => {
        return isProcessing || task.status === "claimed" ||
            (task.status === "in_progress" && !(task as any).countdown);
    };

    const canShowVerifyButton = () => {
        return task.status === "in_progress" && (task as any).countdown === 0;
    };

    return (
        <Card className="bg-white/5 border border-white/20 hover:bg-white/10 transition-colors">
            <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div>
                            <h3 className="font-bold text-white">
                                {task.title}
                            </h3>
                            <p className="text-white/60 text-sm">
                                {task.description}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {getStatusIcon()}
                        <span className="text-xs text-white/60">
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                {/* Instruction text for in-progress tasks */}
                {task.status === "in_progress" && (
                    <div className="mb-3 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                        <p className="text-yellow-300 text-sm">
                            {t(getTaskKey("waiting"))}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
              ${task.status === "claimed" ? "bg-gray-500 cursor-not-allowed" : ""}
            `}
                        startContent={
                            task.status === "available" && task.action_url ?
                                <ExternalLink size={16} /> : null
                        }
                        onPress={onAction}
                    >
                        {getButtonText()}
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};

export default TaskCard;