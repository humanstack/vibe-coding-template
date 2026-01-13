import { DurableObject } from 'cloudflare:workers';
import { Env, DeploymentProgress } from '../types/env';

interface SessionState {
  deploymentId: string;
  userId: string;
  projectId: string;
  progress: DeploymentProgress;
  logs: Array<{ timestamp: string; level: string; message: string }>;
  startedAt: string;
  completedAt?: string;
}

interface WebSocketMessage {
  type: 'progress' | 'log' | 'complete' | 'error' | 'ping' | 'pong';
  data?: unknown;
}

export class DeploymentSession extends DurableObject {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string }>;
  private sessionState: SessionState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade for real-time updates
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST API endpoints
    switch (true) {
      case path === '/init' && request.method === 'POST':
        return this.handleInit(request);

      case path === '/progress' && request.method === 'POST':
        return this.handleProgress(request);

      case path === '/log' && request.method === 'POST':
        return this.handleLog(request);

      case path === '/complete' && request.method === 'POST':
        return this.handleComplete(request);

      case path === '/error' && request.method === 'POST':
        return this.handleError(request);

      case path === '/state' && request.method === 'GET':
        return this.handleGetState();

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Handle WebSocket connection for real-time updates
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);

    // Extract user ID from query params or auth header
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anonymous';

    this.sessions.set(server, { userId });

    // Send current state if available
    if (this.sessionState) {
      server.send(JSON.stringify({
        type: 'progress',
        data: this.sessionState.progress
      }));
    }

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data: WebSocketMessage = JSON.parse(message as string);

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.sessions.delete(ws);
  }

  /**
   * Initialize a new deployment session
   */
  private async handleInit(request: Request): Promise<Response> {
    const body = await request.json() as {
      deploymentId: string;
      userId: string;
      projectId: string;
    };

    this.sessionState = {
      deploymentId: body.deploymentId,
      userId: body.userId,
      projectId: body.projectId,
      progress: {
        stage: 'validating',
        progress: 0,
        message: 'Initializing deployment...'
      },
      logs: [],
      startedAt: new Date().toISOString()
    };

    // Persist state
    await this.state.storage.put('session', this.sessionState);

    this.broadcast({
      type: 'progress',
      data: this.sessionState.progress
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Update deployment progress
   */
  private async handleProgress(request: Request): Promise<Response> {
    const progress = await request.json() as DeploymentProgress;

    if (this.sessionState) {
      this.sessionState.progress = progress;
      await this.state.storage.put('session', this.sessionState);

      this.broadcast({
        type: 'progress',
        data: progress
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Add a log entry
   */
  private async handleLog(request: Request): Promise<Response> {
    const log = await request.json() as { level: string; message: string };

    if (this.sessionState) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: log.level,
        message: log.message
      };

      this.sessionState.logs.push(logEntry);
      await this.state.storage.put('session', this.sessionState);

      this.broadcast({
        type: 'log',
        data: logEntry
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Mark deployment as complete
   */
  private async handleComplete(request: Request): Promise<Response> {
    const body = await request.json() as {
      url?: string;
      previewUrl?: string;
    };

    if (this.sessionState) {
      this.sessionState.progress = {
        stage: 'complete',
        progress: 100,
        message: 'Deployment complete!',
        details: body
      };
      this.sessionState.completedAt = new Date().toISOString();

      await this.state.storage.put('session', this.sessionState);

      this.broadcast({
        type: 'complete',
        data: {
          progress: this.sessionState.progress,
          url: body.url,
          previewUrl: body.previewUrl
        }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Handle deployment error
   */
  private async handleError(request: Request): Promise<Response> {
    const body = await request.json() as {
      message: string;
      details?: unknown;
    };

    if (this.sessionState) {
      this.sessionState.progress = {
        stage: 'failed',
        progress: this.sessionState.progress.progress,
        message: body.message,
        details: body.details as Record<string, unknown> | undefined
      };
      this.sessionState.completedAt = new Date().toISOString();

      await this.state.storage.put('session', this.sessionState);

      this.broadcast({
        type: 'error',
        data: {
          message: body.message,
          details: body.details
        }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get current session state
   */
  private async handleGetState(): Promise<Response> {
    if (!this.sessionState) {
      // Try to restore from storage
      this.sessionState = await this.state.storage.get('session') as SessionState | null;
    }

    return new Response(JSON.stringify(this.sessionState || {}), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    for (const ws of this.sessions.keys()) {
      try {
        ws.send(messageStr);
      } catch (error) {
        // Remove dead connections
        this.sessions.delete(ws);
      }
    }
  }
}
