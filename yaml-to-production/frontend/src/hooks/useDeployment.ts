import { useEffect, useRef, useCallback } from 'react';
import { useDeployStore } from '@/stores/deploy';
import type { DeploymentProgress } from '@/types';

export function useDeploymentWebSocket(deploymentId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    setDeploymentProgress,
    addDeploymentLog,
    setUrls,
    setStep,
  } = useDeployStore();

  const connect = useCallback(() => {
    if (!deploymentId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/deployments/${deploymentId}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'progress':
            setDeploymentProgress(message.data as DeploymentProgress);
            break;

          case 'log':
            addDeploymentLog(message.data);
            break;

          case 'complete':
            setDeploymentProgress({
              stage: 'complete',
              progress: 100,
              message: 'Deployment complete!',
            });
            setUrls(message.data.url, message.data.previewUrl);
            setStep('preview');
            break;

          case 'error':
            setDeploymentProgress({
              stage: 'failed',
              progress: 0,
              message: message.data.message,
            });
            break;

          case 'pong':
            // Keepalive response
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [deploymentId, setDeploymentProgress, addDeploymentLog, setUrls, setStep]);

  // Send keepalive ping every 30 seconds
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  // Connect when deploymentId changes
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return { disconnect };
}
