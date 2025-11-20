import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('wanted_criminals')
export class WantedCriminal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // Họ tên đối tượng

    @Column()
    birthYear: number; // Năm sinh

    @Column({ nullable: true })
    address: string; // Nơi ĐKTT (Đăng ký thường trú)

    @Column({ nullable: true })
    parents: string; // Họ tên bố/mẹ

    @Column()
    crime: string; // Tội danh

    @Column({ nullable: true })
    decisionNumber: string; // Số ngày QĐ

    @Column({ nullable: true })
    issuingUnit: string; // Đơn vị ra QĐTN (Quyết định truy nã)

    @CreateDateColumn()
    createdAt: Date;
}

