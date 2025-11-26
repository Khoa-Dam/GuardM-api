import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WeatherNewsType {
    DISASTER_WARNING = 'disaster_warning', // Tin cảnh báo thiên tai
    WEATHER_FORECAST = 'weather_forecast', // Tin khí tượng thủy văn
}

@Entity('weather_news')
export class WeatherNews {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: WeatherNewsType })
    type: WeatherNewsType;

    @Column()
    title: string; // Tiêu đề tin

    @Column('text', { nullable: true })
    summary: string; // Tóm tắt nội dung

    @Column('text', { nullable: true })
    content: string; // Nội dung đầy đủ

    @Column({ nullable: true })
    imageUrl: string; // Ảnh chủ đạo

    @Column({ nullable: true })
    sourceUrl: string; // Link bài gốc trên nchmf.gov.vn

    @Column({ nullable: true })
    publishedDate: Date; // Ngày đăng / Tin phát lúc

    @Column({ nullable: true })
    nextUpdateAt: Date; // Tin phát tiếp theo lúc (khi nào sẽ có cập nhật)

    @Column({ nullable: true })
    location: string; // Địa điểm (ví dụ: "Biển Đông", "Đắk Lắk")

    @Column({ nullable: true })
    severity: string; // Mức độ cảnh báo (ví dụ: "Bão số 15", "Lũ trên sông")

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

