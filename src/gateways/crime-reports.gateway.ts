import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { CrimeReportResponse } from '../crime-reports/dtos/crime-report-response.dto';
import { gridCellKey, adjacentGridKeys } from '../shared/geo.utils';

const CORS_ORIGINS = process.env.NODE_ENV === 'production'
    ? ['https://guardm.space']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

@WebSocketGateway({
    cors: { origin: CORS_ORIGINS, credentials: true },
    transports: ['websocket', 'polling'],
})
export class CrimeReportsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(CrimeReportsGateway.name);

    constructor(private readonly jwtService: JwtService) {}

    afterInit() {
        this.logger.log('WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        const token = client.handshake.auth?.token as string;
        if (token) {
            try {
                const payload = this.jwtService.verify(token);
                client.data.userId = payload.userId;
                client.data.role = payload.role;
                this.logger.log(`Client connected: ${payload.userId} [${client.id}]`);
            } catch {
                // Expired/invalid token — treat as anonymous instead of disconnecting
                client.data.userId = null;
                this.logger.log(`Anonymous client connected (bad token) [${client.id}]`);
            }
        } else {
            client.data.userId = null;
            this.logger.log(`Anonymous client connected [${client.id}]`);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected [${client.id}]`);
    }

    // ── Room subscriptions ────────────────────────────────────────────────────

    @SubscribeMessage('subscribe:area')
    handleSubscribeArea(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { lat: number; lng: number; radiusKm?: number },
    ) {
        const room = `area:${gridCellKey(data.lat, data.lng)}`;
        client.join(room);
        client.data.areaRoom = room;
        return { ok: true, room };
    }

    @SubscribeMessage('unsubscribe:area')
    handleUnsubscribeArea(@ConnectedSocket() client: Socket) {
        if (client.data.areaRoom) {
            client.leave(client.data.areaRoom);
            client.data.areaRoom = null;
        }
        return { ok: true };
    }

    // ── Broadcast helpers (called by CrimeReportsService) ────────────────────

    broadcastReportCreated(report: CrimeReportResponse) {
        this.server.emit('report:created', report);

        if (report.lat && report.lng) {
            for (const key of adjacentGridKeys(report.lat, report.lng)) {
                this.server.to(`area:${key}`).emit('report:nearby', report);
            }
        }
        this.logger.log(`Broadcasted report:created [${report.id}]`);
    }

    broadcastReportUpdated(report: CrimeReportResponse) {
        this.server.emit('report:updated', report);
    }

    broadcastReportDeleted(id: string) {
        this.server.emit('report:deleted', { id });
    }

    broadcastStats(stats: { total: number; online: number }) {
        this.server.emit('stats:update', stats);
    }

    getConnectedCount(): number {
        return (this.server?.sockets as unknown as Map<string, unknown>)?.size ?? 0;
    }
}
