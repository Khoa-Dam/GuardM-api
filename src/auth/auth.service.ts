import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MoreThan } from 'typeorm';
import { randomUUID } from 'crypto';
import { Role } from './enums/role.enum';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
    ) { }

    async signup(signupData: SignupDto) {
        const { email, password, name } = signupData;

        // Check if email is in use
        const emailInUse = await this.userRepository.findOne({
            where: { email },
        });
        if (emailInUse) {
            throw new BadRequestException('Email already in use');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with default 'User' role
        await this.userRepository.save({
            name,
            email,
            password: hashedPassword,
            role: Role.User,
        });
    }

    async login(credentials: LoginDto) {
        const { email, password } = credentials;

        // Find if user exists by email
        const user = await this.userRepository.findOne({
            where: { email },
        });
        if (!user) {
            throw new UnauthorizedException('Wrong credentials');
        }

        // Google-only account (no password set)
        if (!user.password) {
            throw new UnauthorizedException('Tài khoản này đăng nhập bằng Google. Vui lòng dùng nút "Đăng nhập với Google".');
        }

        // Compare entered password with existing password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('Wrong credentials');
        }

        // Generate JWT tokens
        const tokens = await this.generateUserTokens(user.id);
        return {
            ...tokens,
            userId: user.id,
            role: user.role,
        };
    }

    async googleLogin(idToken: string) {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Verify Google ID token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new UnauthorizedException('Google token không hợp lệ');
        }

        const { email, name, sub: googleId } = payload;

        // Find existing user by email
        let user = await this.userRepository.findOne({ where: { email } });

        if (user) {
            // Link Google account if not already linked
            if (!user.googleId) {
                await this.userRepository.update(user.id, { googleId });
            }
        } else {
            // Create new user (no password for Google-only accounts)
            user = await this.userRepository.save({
                name: name || email,
                email,
                password: null,
                googleId,
                role: Role.User,
            });
        }

        const tokens = await this.generateUserTokens(user.id);
        return {
            ...tokens,
            userId: user.id,
            role: user.role,
        };
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        // Find the user
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException('User not found...');
        }

        // Compare the old password with the password in DB
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('Wrong credentials');
        }

        // Change user's password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(userId, {
            password: newHashedPassword,
        });
    }

    async refreshTokens(refreshToken: string) {
        const token = await this.refreshTokenRepository.findOne({
            where: {
                token: refreshToken,
                expiryDate: MoreThan(new Date()),
            },
        });

        if (!token) {
            throw new UnauthorizedException('Refresh Token is invalid');
        }

        const user = await this.userRepository.findOne({
            where: { id: token.userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const tokens = await this.generateUserTokens(token.userId);
        return {
            ...tokens,
            userId: user.id,
            role: user.role,
        };
    }

    async generateUserTokens(userId: string) {
        const accessToken = this.jwtService.sign({ userId }, { expiresIn: '1h' });
        const refreshToken = randomUUID();

        await this.storeRefreshToken(refreshToken, userId);
        return {
            accessToken,
            refreshToken,
        };
    }

    async storeRefreshToken(token: string, userId: string) {
        // Calculate expiry date 3 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3);

        // Find existing refresh token for user
        const existingToken = await this.refreshTokenRepository.findOne({
            where: { userId },
        });

        if (existingToken) {
            // Update existing token
            await this.refreshTokenRepository.update(existingToken.id, {
                token,
                expiryDate,
            });
        } else {
            // Create new token
            await this.refreshTokenRepository.save({
                token,
                userId,
                expiryDate,
            });
        }
    }
}
