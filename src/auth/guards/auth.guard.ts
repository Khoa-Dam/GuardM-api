import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;
        const token = authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException();
        }
        try {
            const tokenPayload = await this.jwtService.verifyAsync(token);
            const user = await this.userRepository.findOne({
                where: { id: tokenPayload.userId },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            request.user = {
                userId: user.id,
                role: user.role,
            }
            return true;
        } catch (error) {
            throw new UnauthorizedException();
        }
    }
}