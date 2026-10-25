import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
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
            name: user.name,
            avatar: user.avatar,
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

        const { email, name, sub: googleId, picture } = payload;

        // Find existing user by email
        let user = await this.userRepository.findOne({ where: { email } });

        if (user) {
            // Link Google account and sync avatar if not already set
            const updates: Partial<typeof user> = {};
            if (!user.googleId) updates.googleId = googleId;
            if (!user.avatar && picture) updates.avatar = picture;
            if (Object.keys(updates).length) {
                await this.userRepository.update(user.id, updates);
                Object.assign(user, updates);
            }
        } else {
            // Create new user (no password for Google-only accounts)
            user = await this.userRepository.save({
                name: name || email,
                email,
                password: null,
                googleId,
                avatar: picture || null,
                role: Role.User,
            });
        }

        const tokens = await this.generateUserTokens(user.id);
        return {
            ...tokens,
            userId: user.id,
            role: user.role,
            name: user.name,
            avatar: user.avatar,
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

        // Revoke all sessions after a password change.
        await this.refreshTokenRepository.delete({ userId });
    }

    async refreshTokens(refreshToken: string) {
        const now = new Date();
        const tokenHash = this.hashRefreshToken(refreshToken);
        let storedToken = await this.refreshTokenRepository.findOne({
            where: {
                tokenHash,
                expiryDate: MoreThan(now),
            },
        });

        // Accept existing plaintext rows once, then upgrade them to hashes.
        if (!storedToken) {
            const legacyToken = await this.refreshTokenRepository.findOne({
                where: { tokenHash: refreshToken, expiryDate: MoreThan(now) },
            });

            if (legacyToken) {
                const upgraded = await this.refreshTokenRepository.update(
                    { id: legacyToken.id, tokenHash: refreshToken, expiryDate: MoreThan(now) },
                    { tokenHash, expiryDate: this.getRefreshTokenExpiry() },
                );

                storedToken = upgraded.affected
                    ? { ...legacyToken, tokenHash }
                    : await this.refreshTokenRepository.findOne({
                        where: { tokenHash, expiryDate: MoreThan(now) },
                    });
            }
        }

        // A concurrent request may have upgraded the legacy row after the first lookup.
        if (!storedToken) {
            storedToken = await this.refreshTokenRepository.findOne({
                where: { tokenHash, expiryDate: MoreThan(now) },
            });
        }

        if (!storedToken) {
            throw new UnauthorizedException('Refresh Token is invalid');
        }

        const user = await this.userRepository.findOne({
            where: { id: storedToken.userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Keep the opaque refresh token stable for this session. Concurrent refresh
        // calls therefore remain idempotent instead of racing to replace one another.
        const renewed = await this.refreshTokenRepository.update(
            { id: storedToken.id, tokenHash, expiryDate: MoreThan(now) },
            { expiryDate: this.getRefreshTokenExpiry() },
        );
        if (!renewed.affected) {
            throw new UnauthorizedException('Refresh Token is invalid');
        }

        return {
            accessToken: this.createAccessToken(user.id, user.role),
            refreshToken,
            userId: user.id,
            role: user.role,
        };
    }

    async generateUserTokens(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'role'] });
        const accessToken = this.createAccessToken(userId, user?.role);
        const refreshToken = randomUUID();

        await this.storeRefreshToken(refreshToken, userId);
        return {
            accessToken,
            refreshToken,
        };
    }

    async storeRefreshToken(token: string, userId: string) {
        await this.refreshTokenRepository.delete({
            userId,
            expiryDate: LessThanOrEqual(new Date()),
        });
        await this.refreshTokenRepository.save({
            tokenHash: this.hashRefreshToken(token),
            userId,
            expiryDate: this.getRefreshTokenExpiry(),
        });
    }

    async revokeRefreshToken(refreshToken: string): Promise<void> {
        const tokenHash = this.hashRefreshToken(refreshToken);
        let storedToken = await this.refreshTokenRepository.findOne({ where: { tokenHash } });

        // Allow logout from sessions issued before the hash-at-rest change.
        if (!storedToken) {
            storedToken = await this.refreshTokenRepository.findOne({ where: { tokenHash: refreshToken } });
        }

        if (storedToken) {
            await this.refreshTokenRepository.delete(storedToken.id);
        }
    }

    private hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private getRefreshTokenExpiry(): Date {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3);
        return expiryDate;
    }

    private createAccessToken(userId: string, role: Role | undefined): string {
        return this.jwtService.sign({ userId, role }, { expiresIn: '1h' });
    }
}
