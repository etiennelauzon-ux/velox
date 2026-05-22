import { z } from 'zod';

export const rawPointSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  ele: z.number(),
});

export const rawPointArraySchema = z.array(rawPointSchema);

export const parsedGpxSchema = z.object({
  points: rawPointArraySchema,
  detectedName: z.string(),
});

export const stravaTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
  athlete: z.object({
    firstname: z.string().optional(),
    lastname: z.string().optional(),
  }).optional(),
});

export const livePeerSchema = z.object({
  id: z.string(),
  room: z.string().optional(),
  name: z.string(),
  color: z.string(),
  lat: z.number(),
  lon: z.number(),
  ele: z.number(),
  speed: z.number(),
  power: z.number(),
  cadence: z.number(),
  hr: z.number(),
  elapsed: z.number(),
  routeDistance: z.number(),
  routeLen: z.number(),
  routeName: z.string(),
  recording: z.boolean(),
  updatedAt: z.number(),
});

export const livePeerArraySchema = z.array(livePeerSchema);
export type LivePeerValidated = z.infer<typeof livePeerSchema>;
