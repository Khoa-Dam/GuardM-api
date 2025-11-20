import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CrimeType } from '../../enums/crime-type.enum';

@Entity('crime_reports')
export class CrimeReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    reporterId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reporterId' })
    reporter: User;

    @Column({ nullable: true })
    title: string;

    @Column('text', { nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: CrimeType,
        nullable: true,
    })
    type: CrimeType;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    lat: number;

    @Column('decimal', { precision: 10, scale: 7, nullable: true })
    lng: number;

    @Column('geometry', { nullable: true })
    geom: any;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    areaCode: string;

    @Column({ nullable: true })
    province: string;

    @Column({ nullable: true })
    district: string;

    @Column({ nullable: true })
    ward: string;

    @Column({ nullable: true })
    street: string;

    @Column({ default: 'user' })
    source: string;

    @Column('json', { nullable: true })
    attachments: string[];

    @Column({ type: 'smallint', default: 0 })
    status: number;

    @Column({ type: 'smallint', default: 1 })
    severity: number;

    @Column({ type: 'timestamp', nullable: true })
    reportedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @CreateDateColumn()
    updatedAt: Date;
}
