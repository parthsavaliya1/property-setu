export type MediaSettings = {
  maxPhotos: number;
  maxVideos: number;
  maxVideoDurationSeconds: number;
  photoMaxEdge: number;
  photoQuality: number;
  photoTargetKb: number;
  videoMaxEdge: number;
  videoQuality: "high" | "balanced" | "compact";
};
export const defaultMediaSettings: MediaSettings = {
  maxPhotos: 29, maxVideos: 1, maxVideoDurationSeconds: 60,
  photoMaxEdge: 720, photoQuality: 85, photoTargetKb: 60,
  videoMaxEdge: 480, videoQuality: "compact",
};
