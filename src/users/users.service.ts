import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateMeDto } from './dtos/update-me.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async findUserByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findUserById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async create(createDto: CreateUserDto): Promise<Omit<User, 'password'>> {
        // Check if email is already in use
        const existingUser = await this.findUserByEmail(createDto.email);
        if (existingUser) {
            throw new BadRequestException('Email already in use');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        // Create user
        const user = this.userRepository.create({
            name: createDto.name,
            email: createDto.email,
            password: hashedPassword,
            role: createDto.role || Role.User,
        });

        await this.userRepository.save(user);

        // Return user without password by selecting specific fields
        return this.findOne(user.id);
    }

    async findAll(): Promise<Omit<User, 'password'>[]> {
        return this.userRepository.find({
            select: ['id', 'name', 'email', 'role', 'avatar'],
            order: { name: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Omit<User, 'password'>> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'name', 'email', 'role', 'avatar'],
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async findMe(userId: string): Promise<Omit<User, 'password'>> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'name', 'email', 'role', 'avatar', 'googleId'],
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async updateMe(userId: string, updateDto: UpdateMeDto): Promise<Omit<User, 'password'>> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updates: Partial<User> = {};
        if (updateDto.name !== undefined) updates.name = updateDto.name;
        if (updateDto.avatar !== undefined) updates.avatar = updateDto.avatar;

        if (Object.keys(updates).length) {
            await this.userRepository.update(userId, updates);
        }

        return this.findMe(userId);
    }

    async update(id: string, updateDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
        // Check if user exists
        const existingUser = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'email', 'name', 'role'] // Chỉ cần các fields này để check
        });
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        // Check if email is being changed and if it's already in use
        if (updateDto.email && updateDto.email !== existingUser.email) {
            const emailInUse = await this.findUserByEmail(updateDto.email);
            if (emailInUse) {
                throw new BadRequestException('Email already in use');
            }
        }

        // Update user fields (TypeORM sẽ chỉ update các fields được cung cấp)
        await this.userRepository.update(id, updateDto);

        // Return updated user without password
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        // Check if user exists
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Delete by ID (không cần entity đầy đủ)
        await this.userRepository.delete(id);
    }
}
