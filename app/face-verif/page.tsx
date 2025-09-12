// src/app/face-verif/page.tsx

"use client";

import React from "react";
import FaceVerification from "@/components/FaceVerification/FaceVerification";

export default function FaceVerifPage() {
  return (
    <div className="fixed inset-0 bg-black">
      <FaceVerification />
    </div>
  );
}