import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useStockOpnameSessions } from './useStockOpnameSessions';

describe('useStockOpnameSessions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should fetch sessions successfully', async () => {
    const { result } = renderHook(() => useStockOpnameSessions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should accept status filter', async () => {
    const { result } = renderHook(
      () => useStockOpnameSessions({ status: 'pending_approval' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });

  it('should accept location filter', async () => {
    const { result } = renderHook(
      () => useStockOpnameSessions({ location: 'toko' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });

  it('should accept date range filters', async () => {
    const { result } = renderHook(
      () =>
        useStockOpnameSessions({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });

  it('should accept all filters combined', async () => {
    const { result } = renderHook(
      () =>
        useStockOpnameSessions({
          status: 'completed',
          location: 'gudang',
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });
});
