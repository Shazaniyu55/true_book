import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/types/enums';
import { LocationService } from '@modules/location/service/location.service';
import { LocationPingDto } from '@modules/location/dtos/location.dto';


interface SocketCtx {
  userId: string;
  role: UserRole;
}

@WebSocketGateway({
  cors: { origin: process.env.WS_CORS_ORIGIN?.split(',') ?? false },
  namespace: '/rides',
})
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RidesGateway.name);
  private readonly sockets = new Map<string, SocketCtx>(); // socketId → ctx

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly locationService: LocationService,
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

      this.sockets.set(client.id, { userId: payload.sub, role: payload.role });
      client.join(`user:${payload.sub}`);
      this.logger.log(`${payload.role} ${payload.sub} connected — ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.sockets.delete(client.id);
  }

  // ── Driver pushes location (only for trips they own & that are ACTIVE) ──
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LocationPingDto,
  ) {
    const ctx = this.sockets.get(client.id);
    if (!ctx || ctx.role !== UserRole.DRIVER) {
      throw new WsException('Only drivers can send location');
    }

    const payload = await this.locationService.recordPing(ctx.userId, dto);
    // Broadcast to everyone watching this trip (admins)
    this.server.to(`trip:${dto.tripId}`).emit('location:update', payload);
    return { event: 'location:ack', data: { at: payload.at } };
  }

  // ── Admin subscribes to a trip's live feed ──────────────────────────────
  @SubscribeMessage('admin:track_trip')
  handleAdminTrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const ctx = this.sockets.get(client.id);
    if (!ctx || ctx.role !== UserRole.ADMIN) {
      throw new WsException('Forbidden');
    }
    client.join(`trip:${data.tripId}`);
    return { event: 'tracking', data: { tripId: data.tripId } };
  }

  @SubscribeMessage('admin:untrack_trip')
  handleAdminUntrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    client.leave(`trip:${data.tripId}`);
  }
}