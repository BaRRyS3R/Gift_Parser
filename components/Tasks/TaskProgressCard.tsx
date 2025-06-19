// src/components/Tasks/TaskProgressCard.tsx - Компонент прогресса заданий

"use client";

import React from "react";
import { Card, CardBody, Progress } from "@nextui-org/react";
import { Trophy, Target, Gift } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface TaskProgressCardProps {
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    totalReward: number;
}

const TaskProgressCard: React.FC<TaskProgressCardProps> = ({
    progress,
    totalReward
}) => {
    const t = useT();

    return (
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 mb-6">
            <CardBody className="p-6">
                <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-white mb-2">
                        {t("tasks.progress")}
                    </h2>
                    <div className="text-3xl font-bold text-blue-300 mb-1">
                        {progress.completed}/{progress.total}
                    </div>
                    <p className="text-white/60 text-sm">
                        {t("tasks.completedTasks")}
                    </p>
                </div>

                <div className="mb-4">
                    <Progress
                        value={progress.percentage}
                        color="primary"
                        className="mb-2"
                        classNames={{
                            track: "bg-white/20",
                            indicator: "bg-gradient-to-r from-blue-500 to-purple-500"
                        }}
                    />
                    <div className="text-center text-white/80 text-sm">
                        {progress.percentage}% {t("common.completed")}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Target className="text-blue-400" size={20} />
                        </div>
                        <div className="text-lg font-bold text-white">
                            {progress.total}
                        </div>
                        <div className="text-white/60 text-xs">
                            {t("common.total")} {t("nav.tasks")}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Gift className="text-green-400" size={20} />
                        </div>
                        <div className="text-lg font-bold text-green-400">
                            +{totalReward}
                        </div>
                        <div className="text-white/60 text-xs">
                            {t("tasks.totalReward")}
                        </div>
                    </div>
                </div>

                {progress.percentage === 100 && (
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-400/30 rounded-lg text-center">
                        <Trophy className="text-yellow-400 mx-auto mb-2" size={24} />
                        <p className="text-green-300 font-bold text-sm">
                            🎉 All tasks completed! 🎉
                        </p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TaskProgressCard;