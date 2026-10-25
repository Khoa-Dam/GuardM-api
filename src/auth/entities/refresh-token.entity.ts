import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('refresh_tokens')
@Index('IDX_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'token' })
    tokenHash!: string;

    @Column()
    userId!: string;

    @Column()
    expiryDate!: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
