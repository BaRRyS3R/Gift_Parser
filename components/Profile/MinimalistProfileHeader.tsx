// src/components/Profile/MinimalistProfileHeader.tsx - Clean minimalist profile header

"use client";

import React from "react";
import type { User as UserType } from "@/lib/supabase";

interface MinimalistProfileHeaderProps {
    user: UserType;
}

const MinimalistProfileHeader: React.FC<MinimalistProfileHeaderProps> = ({ user }) => {
    return (
        <div className="text-center space-y-3 px-4 py-6">
            {/* User Name */}
            <h1 className="text-2xl font-bold text-white">
                {user.first_name} {user.last_name || ""}
            </h1>

            {/* Username */}
            {user.username && (
                <p className="text-white/60 text-sm">
                    @{user.username}
                </p>
            )}
        </div>
    );
};

export default MinimalistProfileHeader;