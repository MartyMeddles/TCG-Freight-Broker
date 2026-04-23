import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export interface LoadEvent {
  loadId: number;
  referenceNumber: string;
  lane: string;
  targetRate: number;
  bookedRate: number | null;
  status: string;
  isAutoBooked: boolean;
  recommendation: string;
  decisionReason: string;
  evaluatedAt: string;
}

interface UseLoadsHubOptions {
  onLoadEvaluated?: (event: LoadEvent) => void;
  onAutoModeChanged?: (enabled: boolean) => void;
}

export function useLoadsHub({ onLoadEvaluated, onAutoModeChanged }: UseLoadsHubOptions = {}) {
  const connRef = useRef<signalR.HubConnection | null>(null);
  const onLoadEvaluatedRef = useRef(onLoadEvaluated);
  const onAutoModeChangedRef = useRef(onAutoModeChanged);

  // Keep refs in sync without reconnecting
  useEffect(() => { onLoadEvaluatedRef.current = onLoadEvaluated; }, [onLoadEvaluated]);
  useEffect(() => { onAutoModeChangedRef.current = onAutoModeChanged; }, [onAutoModeChanged]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/loads`, {
        accessTokenFactory: () => sessionStorage.getItem('jwt') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('LoadEvaluated', (event: LoadEvent) => {
      onLoadEvaluatedRef.current?.(event);
    });

    connection.on('AutoModeChanged', (enabled: boolean) => {
      onAutoModeChangedRef.current?.(enabled);
    });

    connection.start().catch((err) => {
      console.warn('SignalR connection failed:', err);
    });

    connRef.current = connection;

    return () => {
      connection.stop();
    };
  }, []); // only runs once

  const stop = useCallback(() => connRef.current?.stop(), []);

  return { stop };
}
