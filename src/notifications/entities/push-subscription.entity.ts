import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    userId: string;

    @Column({ unique: true })
    endpoint: string;

    @Column('jsonb')
    keys: { p256dh: string; auth: string };

    // User's last known location for proximity alerts
    @Column('float', { nullable: true })
    lat: number | null;

    @Column('float', { nullable: true })
    lng: number | null;

    @Column({ default: true })
    active: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
