import { logError, logInfo } from '@/lib/logger';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

export class WebSocketServer {
    private io: SocketIOServer;
    private sessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of socket IDs

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket: Socket) => {
            logInfo(`[WebSocket] Client connected: ${socket.id}`);

            // Join session room
            socket.on('session:join', (data: { sessionId: string; userId: string }) => {
                const { sessionId, userId } = data;

                logInfo(`[WebSocket] User ${userId} joining session ${sessionId}`);

                socket.join(sessionId);

                // Track session participants
                if (!this.sessions.has(sessionId)) {
                    this.sessions.set(sessionId, new Set());
                }
                this.sessions.get(sessionId)?.add(socket.id);

                // Notify others in the session
                socket.to(sessionId).emit('session:participant:joined', {
                    socketId: socket.id,
                    userId,
                    timestamp: new Date().toISOString(),
                });

                socket.emit('session:joined', { sessionId, socketId: socket.id });
            });

            // Leave session room
            socket.on('session:leave', (data: { sessionId: string }) => {
                const { sessionId } = data;

                logInfo(`[WebSocket] Socket ${socket.id} leaving session ${sessionId}`);

                socket.leave(sessionId);
                this.sessions.get(sessionId)?.delete(socket.id);

                socket.to(sessionId).emit('session:participant:left', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString(),
                });
            });

            // Screen data streaming
            socket.on('screen:data', (data: { sessionId: string; frame: any }) => {
                const { sessionId, frame } = data;
                // Forward screen data to all participants in the session
                socket.to(sessionId).emit('screen:frame', frame);
            });

            // Input forwarding - mouse events
            socket.on('input:mouse', (data: { sessionId: string; event: any }) => {
                const { sessionId, event } = data;
                socket.to(sessionId).emit('remote:mouse', event);
            });

            // Input forwarding - keyboard events
            socket.on('input:keyboard', (data: { sessionId: string; event: any }) => {
                const { sessionId, event } = data;
                socket.to(sessionId).emit('remote:keyboard', event);
            });

            // Connection quality metrics
            socket.on('connection:quality', (data: { sessionId: string; metrics: any }) => {
                const { sessionId, metrics } = data;
                socket.to(sessionId).emit('quality:update', metrics);
            });

            // WebRTC signaling
            socket.on('webrtc:offer', (data: { sessionId: string; offer: any }) => {
                const { sessionId, offer } = data;
                socket.to(sessionId).emit('webrtc:offer', { offer, from: socket.id });
            });

            socket.on('webrtc:answer', (data: { sessionId: string; answer: any }) => {
                const { sessionId, answer } = data;
                socket.to(sessionId).emit('webrtc:answer', { answer, from: socket.id });
            });

            socket.on('webrtc:ice-candidate', (data: { sessionId: string; candidate: any }) => {
                const { sessionId, candidate } = data;
                socket.to(sessionId).emit('webrtc:ice-candidate', { candidate, from: socket.id });
            });

            // Chat messages (optional feature)
            socket.on('chat:message', (data: { sessionId: string; message: string; userId: string }) => {
                const { sessionId, message, userId } = data;
                this.io.to(sessionId).emit('chat:message', {
                    message,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date().toISOString(),
                });
            });

            // Disconnect handling
            socket.on('disconnect', () => {
                logInfo(`[WebSocket] Client disconnected: ${socket.id}`);

                // Clean up session tracking
                this.sessions.forEach((participants, sessionId) => {
                    if (participants.has(socket.id)) {
                        participants.delete(socket.id);
                        socket.to(sessionId).emit('session:participant:left', {
                            socketId: socket.id,
                            timestamp: new Date().toISOString(),
                        });
                    }
                });
            });

            // Error handling
            socket.on('error', (error) => {
                logError('WebSocket socket error', error);
            });
        });
    }

    // Get number of participants in a session
    public getSessionParticipants(sessionId: string): number {
        return this.sessions.get(sessionId)?.size || 0;
    }

    // End a session (kick all participants)
    public endSession(sessionId: string) {
        this.io.to(sessionId).emit('session:ended', {
            reason: 'Session terminated by host',
            timestamp: new Date().toISOString(),
        });

        // Clean up
        this.sessions.delete(sessionId);
    }

    // Send message to specific session
    public sendToSession(sessionId: string, event: string, data: any) {
        this.io.to(sessionId).emit(event, data);
    }

    public getIO(): SocketIOServer {
        return this.io;
    }
}

// Singleton instance
let websocketServer: WebSocketServer | null = null;

export function initializeWebSocketServer(server: HTTPServer): WebSocketServer {
    if (!websocketServer) {
        websocketServer = new WebSocketServer(server);
        logInfo('[WebSocket] Server initialized');
    }
    return websocketServer;
}

export function getWebSocketServer(): WebSocketServer | null {
    return websocketServer;
}
