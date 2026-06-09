import z from 'zod';

export const createOrderSchema = z.object({
  membershipType: z.enum(['gold', 'silver']),
});
