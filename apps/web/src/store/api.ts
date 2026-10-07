import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { seedConversations, type Conversation } from '@support-copilot/shared';

// Stage 2 serves seed data locally. Stage 3 swaps `fakeBaseQuery` for `fetchBaseQuery`
// against the Express server; components only depend on the generated hooks.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery<string>(),
  endpoints: (build) => ({
    getConversations: build.query<Conversation[], void>({
      queryFn: () => ({ data: structuredClone(seedConversations) }),
    }),
  }),
});

export const { useGetConversationsQuery } = api;
