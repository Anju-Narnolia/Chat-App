'use server';

/**
 * @fileOverview Suggests task status updates based on recent chat activity or uploaded attachments.
 *
 * - suggestTaskStatus - A function that suggests task status updates.
 * - SuggestTaskStatusInput - The input type for the suggestTaskStatus function.
 * - SuggestTaskStatusOutput - The return type for the suggestTaskStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskStatusInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to suggest a status for.'),
  recentChatActivity: z
    .string()
    .describe(
      'Recent chat activity related to the task. Include messages, participants, and timestamps.'
    ),
  uploadedAttachments: z
    .array(z.string())
    .describe(
      'List of URLs for attachments uploaded related to the task, should be data uris.'
    ),
});
export type SuggestTaskStatusInput = z.infer<typeof SuggestTaskStatusInputSchema>;

const SuggestTaskStatusOutputSchema = z.object({
  suggestedStatus: z
    .enum(['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'])
    .describe('The suggested task status based on the provided context.'),
  reason: z
    .string()
    .describe(
      'The reasoning behind the suggested status. Explain why this status is appropriate.'
    ),
});
export type SuggestTaskStatusOutput = z.infer<typeof SuggestTaskStatusOutputSchema>;

export async function suggestTaskStatus(input: SuggestTaskStatusInput): Promise<SuggestTaskStatusOutput> {
  return suggestTaskStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskStatusPrompt',
  input: {schema: SuggestTaskStatusInputSchema},
  output: {schema: SuggestTaskStatusOutputSchema},
  prompt: `You are a task management assistant that analyzes context to intelligently suggest status updates for tasks.

  You will be provided with recent chat activity and uploaded attachments related to a specific task. Your goal is to suggest the most appropriate status update for the task based on this information.

  The possible task statuses are: Backlog, Todo, In Progress, Done, Canceled.

  Chat Activity:
  {{#if recentChatActivity}}
  {{{recentChatActivity}}}
  {{else}}
  No chat activity available.
  {{/if}}

  Uploaded Attachments:
  {{#if uploadedAttachments}}
    {{#each uploadedAttachments}}
    - {{media url=this}}
    {{/each}}
  {{else}}
  No attachments uploaded.
  {{/if}}

  Based on this information, what is the most appropriate task status? Explain your reasoning.

  Here's how to format your response:
  {
    "suggestedStatus": "<The suggested task status>",
    "reason": "<The reasoning behind the suggested status>"
  }`,
});

const suggestTaskStatusFlow = ai.defineFlow(
  {
    name: 'suggestTaskStatusFlow',
    inputSchema: SuggestTaskStatusInputSchema,
    outputSchema: SuggestTaskStatusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
