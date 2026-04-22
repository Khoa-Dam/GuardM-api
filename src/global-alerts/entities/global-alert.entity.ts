import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('global_alerts')
export class GlobalAlert {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    source!: string; // 'gdelt' | 'rss_vnexpress' | 'rss_tuoitre' | 'rss_dantri'

    @Column('text')
    title!: string;

    @Column({ nullable: true })
    url!: string;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    lat!: number;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    lng!: number;

    @Column({ nullable: true })
    locationName!: string;

    @Column({ default: 'general' })
    category!: string; // crime, disaster, accident, conflict, health, general

    @Column({ default: 'medium' })
    severity!: string; // low | medium | high

    @Column('text', { nullable: true })
    summary!: string;

    @Column({ type: 'timestamp' })
    publishedAt!: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @Index()
    @Column({ unique: true })
    externalId!: string; // dedupe key = article URL
}
