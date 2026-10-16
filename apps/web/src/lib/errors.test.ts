import { describeQueryError, OFFLINE_MESSAGE, RATE_LIMITED_MESSAGE } from './errors';

describe('describeQueryError', () => {
  const fallback = 'Fallback message';

  it('reports a network failure as offline', () => {
    expect(describeQueryError({ status: 'FETCH_ERROR', error: 'x' }, fallback)).toBe(
      OFFLINE_MESSAGE,
    );
  });

  it('reports HTTP 429 as rate limited', () => {
    expect(describeQueryError({ status: 429, data: null }, fallback)).toBe(RATE_LIMITED_MESSAGE);
  });

  it.each([
    ['a server error', { status: 500, data: { error: { message: 'internal detail' } } }],
    ['a parsing error', { status: 'PARSING_ERROR', originalStatus: 200, data: '', error: 'x' }],
    ['a serialized error', { message: 'boom' }],
    ['no error', undefined],
  ] as const)('falls back for %s without leaking details', (_name, error) => {
    expect(describeQueryError(error, fallback)).toBe(fallback);
  });
});
