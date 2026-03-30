import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../auth/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ nullable: true })
  googleId: string | null;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User,
  })
  role: Role;
}

