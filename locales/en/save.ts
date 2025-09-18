// src/locales/en/save.ts - English version
export const save = {
  recording: "Recording survival data...",
  recordingReaction: "Recording reaction time...",
  recordingPhysics: "Recording physics experiment...",
  recordingRotation: "Recording rotation experiment...", // NEW
  retrying: "Retrying save ({attempt}/{max})...",
  connectionIssue: "Connection issue - automatic retry",
  savedSuccessfully: "✓ Result saved successfully",
  savedAfterRetries: "Saved after {attempts} attempts",
  synchronized: "Data synchronized with leaderboard",
  recordedSuccessfully: "✓ Survival record saved successfully",
  physicsRecordedSuccessfully: "✓ Physics experiment saved successfully",
  rotationRecordedSuccessfully: "✓ Rotation experiment saved successfully", // NEW
  attemptNotRecorded: "⚠ Attempt not recorded",
  onlySuccessful: "Only successful reaction times are saved to leaderboard",
  saveFailed: "✗ Save failed after {attempts} attempts",
  saveFailed2: "Save Failed",
  retrySave: "Retry",
} as const;
