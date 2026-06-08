// src/modules/notification/gateway/notification.gateway.ts
import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: process.env.WS_CORS_ORIGIN?.split(',') ?? false },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('common.auth.jwt.accessSecret'),
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`User ${payload.sub} connected to notifications — ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  /** Push a realtime notification to one user (all their devices/tabs). */
  emitToUser(userId: string, payload: any) {
    this.server?.to(`user:${userId}`).emit('notification', payload);
  }

  /** Broadcast to everyone connected (e.g. admin announcements). */
  emitBroadcast(payload: any) {
    this.server?.emit('notification', payload);
  }
}