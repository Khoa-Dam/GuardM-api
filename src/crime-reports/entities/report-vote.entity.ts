import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum VoteType {
    CONFIRM = 'confirm',
    DISPUTE = 'dispute',
}

@Entity('report_votes')
@Index(['userId', 'reportId'], { unique: false })
export class ReportVote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    reportId: string;

    @Column({
        type: 'enum',
        enum: VoteType,
    })
    voteType: VoteType;

    @CreateDateColumn()
    createdAt: Date;
}

