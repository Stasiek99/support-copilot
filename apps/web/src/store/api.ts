import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { analysisSchema, type Analysis, type Conversation } from '@support-copilot/shared';
import { API_BASE_URL } from '../lib/config';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (build) => ({
    getConversations: build.query<Conversation[], void>({
      query: () => 'conversations',
    }),
    // Keyed by the conversation content, so a new message triggers a fresh analysis.
    getAnalysis: build.query<Analysis, Conversation>({
      query: (conversation) => ({ url: 'assist/analysis', method: 'POST', body: conversation }),
      transformResponse: (response: unknown) => analysisSchema.parse(response),
    }),
  }),
});

export const { useGetConversationsQuery, useGetAnalysisQuery } = api;
