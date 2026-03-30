import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
    @ApiProperty({ description: 'Google ID token from OAuth2 flow' })
    @IsString()
    @IsNotEmpty()
    idToken: string;
}
