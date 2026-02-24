import { requireAuth, withErrorHandler } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest } from 'next/server';
import { getOpenAIClient, prompts, defaultModel } from '@/lib/ai/openai';

export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireAuth();
    const { description } = await request.json();

    if (!description) {
        return apiError(400, 'Description is required');
    }

    // Get OpenAI client (will throw if API key is missing)
    const openai = getOpenAIClient();

    // Call OpenAI to categorize the asset
    const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages: [
            {
                role: 'system',
                content: 'You are an IT asset management expert. Provide precise categorization and suggestions.',
            },
            {
                role: 'user',
                content: prompts.assetCategorization(description),
            },
        ],
        response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return apiSuccess(result);
});
