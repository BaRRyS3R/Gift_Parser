// src/locales/ru/save.ts - Save status messages (Updated with Rotation)
export const save = {
    recording: "Запись данных выживания...",
    recordingReaction: "Запись времени реакции...",
    recordingPhysics: "Запись физического эксперимента...",
    recordingRotation: "Запись вращающегося эксперимента...", // NEW
    retrying: "Повтор сохранения ({attempt}/{max})...",
    connectionIssue: "Проблема соединения - автоматический повтор",
    savedSuccessfully: "✓ Результат успешно сохранён",
    savedAfterRetries: "Сохранено после {attempts} попыток",
    synchronized: "Данные синхронизированы с таблицей лидеров",
    recordedSuccessfully: "✓ Запись выживания успешно сохранена",
    physicsRecordedSuccessfully: "✓ Физический эксперимент успешно сохранён",
    rotationRecordedSuccessfully: "✓ Вращающийся эксперимент успешно сохранён", // NEW
} as const;