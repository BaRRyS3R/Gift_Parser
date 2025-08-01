// src/components/Profile/EnhancedProfileHeader.tsx - Обновленный для использования leagues API

"use client";

import type { UserProfileGameStats } from "@/hooks/modules/useProfile";

import React from "react";

import { useT } from "@/contexts/LocalizationContext";

interface EnhancedProfileHeaderProps {
  user: UserProfileGameStats;
}

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({
  user,
}) => {
  const t = useT();

  return (
    <div className="text-center space-y-3 px-4 py-6">
      {/* User Name */}
      <h1 className="text-2xl font-bold text-white">
        {user.first_name} {user.last_name || ""}
      </h1>

      {/* Username */}
      {user.username && (
        <p className="text-white/60 text-sm">@{user.username}</p>
      )}
    </div>
  );
};

export default EnhancedProfileHeader;
