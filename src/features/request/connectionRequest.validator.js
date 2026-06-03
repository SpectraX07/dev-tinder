import z from 'zod';

export const connectionRequestParamsSchema = z.object({
  toUserId: z
    .string()
    .length(24, 'Invalid MongoDB ObjectId')
    .regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId format'),
  status: z.enum(['Interested', 'Ignored']),
});

export const connectionRequestReviewParamsSchema = z.object({
  requestId: z
    .string()
    .length(24, 'Invalid MongoDB ObjectId')
    .regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId format'),
  status: z.enum(['Accepted', 'Rejected']),
});
