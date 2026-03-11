/**
 * Remote Desktop Connection Manager
 * 
 * Orchestrates the lifecycle of a remote desktop session:
 *  1. Session creation via REST API
 *  2. WebSocket signaling for WebRTC handshake
 *  3. WebRTC peer connection for media streaming
 *  4. Session monitoring and graceful teardown
 * 
 * Usage:
 *   const manager = new RemoteDesktopManager(sessionId, wsUrl);
 *   await manager.connect();
 *   manager.disconnect();
 */

import { WebRTCClient, type ConnectionMetrics } from '@/lib/webrtc/client';

export interface RemoteSessionConfig {
    sessionId: string;
    wsUrl?: string;
    iceServers?: RTCIceServer[];
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
}

export type ConnectionState = 'idle' | 'connecting' | 'signaling' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface RemoteDesktopEvents {
    onStateChange?: (state: ConnectionState) => void;
    onStream?: (stream: MediaStream) => void;
    onMetrics?: (metrics: ConnectionMetrics) => void;
    onError?: (error: Error) => void;
    onRecordingReady?: (blob: Blob) => void;
}

export class RemoteDesktopManager {
    private config: RemoteSessionConfig;
    private webrtcClient: WebRTCClient | null = null;
    private ws: WebSocket | null = null;
    private state: ConnectionState = 'idle';
    private events: RemoteDesktopEvents = {};
    private reconnectAttempts = 0;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isHost = false; // remembered for reconnect

    constructor(config: RemoteSessionConfig, events?: RemoteDesktopEvents) {
        this.config = {
            autoReconnect: true,
            maxReconnectAttempts: 3,
            ...config,
        };
        if (events) this.events = events;
    }

    get connectionState(): ConnectionState {
        return this.state;
    }

    /**
     * Establishes connection:
     * 1. Opens WebSocket for signaling
     * 2. Creates WebRTC peer connection
     * 3. Exchanges SDP offers/answers via WebSocket
     */
    async connect(isHost: boolean): Promise<void> {
        this.isHost = isHost;
        this.setState('connecting');

        try {
            // Initialize WebRTC
            this.webrtcClient = new WebRTCClient({
                sessionId: this.config.sessionId,
                isInitiator: isHost,
                iceServers: this.config.iceServers,
            });

            this.setupWebRTCHandlers();

            // If host, capture screen
            if (isHost) {
                await this.webrtcClient.getDisplayMedia();
            }

            this.setState('signaling');

            // Connect WebSocket for signaling
            await this.connectSignaling();

        } catch (err: unknown) {
            this.setState('error');
            this.events.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
    }

    /**
     * Gracefully disconnects all connections
     */
    disconnect(): void {
        this.stopRecording();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.webrtcClient) {
            // Aggressively unhook and destroy all media stream tracks to release hardware locks
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stream = (this.webrtcClient as any).peer?.streams?.[0];
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => {
                    track.stop();
                });
            }

            this.webrtcClient.destroy();
            this.webrtcClient = null;
        }

        this.setState('disconnected');
    }

    /**
     * Starts recording the remote stream
     */
    startRecording(): void {
        if (!this.webrtcClient) return;

        // SimplePeer does not expose remote streams via public API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = (this.webrtcClient as any).peer?.streams?.[0];
        if (!stream) return;

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm',
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            this.events.onRecordingReady?.(blob);
        };

        this.mediaRecorder.start(1000);
    }

    /**
     * Stops recording and triggers onRecordingReady
     */
    stopRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
    }

    // ─── Private Helpers ─────────────────────────────────

    private setState(state: ConnectionState): void {
        this.state = state;
        this.events.onStateChange?.(state);
    }

    private setupWebRTCHandlers(): void {
        if (!this.webrtcClient) return;

        this.webrtcClient.onConnect = () => {
            this.setState('connected');
            this.reconnectAttempts = 0;
        };

        this.webrtcClient.onDisconnect = () => {
            const maxAttempts = this.config.maxReconnectAttempts ?? 3;
            if (this.config.autoReconnect && this.reconnectAttempts < maxAttempts) {
                this.setState('reconnecting');
                this.reconnectAttempts++;

                // Tear down stale connections before reconnecting
                if (this.ws) { this.ws.close(); this.ws = null; }
                if (this.webrtcClient) { this.webrtcClient.destroy(); this.webrtcClient = null; }

                // Exponential backoff: 1s, 2s, 4s ...
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
                setTimeout(() => {
                    this.connect(this.isHost).catch(err => {
                        this.setState('error');
                        this.events.onError?.(err instanceof Error ? err : new Error(String(err)));
                    });
                }, delay);
            } else {
                this.setState('disconnected');
            }
        };

        this.webrtcClient.onStream = (stream) => {
            this.events.onStream?.(stream);
        };

        this.webrtcClient.onError = (err) => {
            this.events.onError?.(err);
        };

        this.webrtcClient.onMetrics = (metrics) => {
            this.events.onMetrics?.(metrics);
        };
    }

    private async connectSignaling(): Promise<void> {
        const wsUrl = this.config.wsUrl ||
            `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${wsUrl}/ws`);

            this.ws.onopen = () => {
                // Join the session room
                this.ws?.send(JSON.stringify({
                    type: 'session:join',
                    sessionId: this.config.sessionId,
                }));
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleSignalingMessage(message);
                } catch {
                    // Ignore non-JSON messages
                }
            };

            this.ws.onerror = () => {
                reject(new Error('WebSocket signaling connection failed'));
            };

            this.ws.onclose = () => {
                if (this.state === 'connected' || this.state === 'signaling') {
                    this.events.onError?.(new Error('Signaling connection lost'));
                }
            };
        });
    }

    private handleSignalingMessage(message: { type: string; signal?: unknown }): void {
        if (!this.webrtcClient) return;

        switch (message.type) {
            case 'signal':
                if (message.signal) {
                    this.webrtcClient.signal(message.signal as Parameters<typeof this.webrtcClient.signal>[0]);
                }
                break;
            case 'session:ended':
                this.disconnect();
                break;
        }
    }
}
