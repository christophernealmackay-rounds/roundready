'use client';

import { useEffect, useState } from 'react';
import { loadAll } from '@/lib/api/bootstrap';
import {
  useAngelsStore,
  useIssuesStore,
  useQapiStore,
  useResidentGroupsStore,
  useResidentsStore,
  useRoundsStore,
  useUsersStore,
} from '@/lib/store';

type Status = 'loading' | 'ready' | 'error';

export default function HydrationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAll();
        if (cancelled) return;
        useUsersStore.getState().hydrate({
          users: data.users,
          departments: data.departments,
        });
        useAngelsStore.getState().hydrate(data.angels);
        useResidentsStore.getState().hydrate(data.residents);
        useResidentGroupsStore.getState().hydrate(data.residentGroups);
        useQapiStore.getState().hydrate({
          qapis: data.qapis,
          notes: data.qaaNotes,
        });
        useRoundsStore.getState().hydrate({
          templates: data.templates,
          questions: data.questions,
          rounds: data.rounds,
        });
        useIssuesStore.getState().hydrate(data.issues);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--muted)]">Loading…</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-md rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] p-6 shadow-md">
          <h2 className="text-base font-semibold text-[var(--ink)] mb-2">
            Could not load data
          </h2>
          <p className="text-sm text-[var(--muted)] mb-4">{error}</p>
          <p className="text-xs text-[var(--faint)]">
            Make sure the backend is running on{' '}
            {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
