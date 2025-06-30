import { z } from 'zod';

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AgentType = z.infer<typeof AgentSchema>;

export const UpdateAgentRequestSchema = AgentSchema.partial();

export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;

export const CreateAgentRequestSchema = AgentSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;
