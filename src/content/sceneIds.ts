export const sceneIds = [
  "balcony-birds",
  "koi-pool",
  "paper-moth",
  "beetle-under-the-fern",
  "red-string",
] as const;

export type SceneId = (typeof sceneIds)[number];
