import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to get new access token',
    example: '8d9b55f3-4f65-4e28-a0b4-91fef468eef3',
  })
  @IsNotEmpty()
  @IsUUID('4')
  refreshToken!: string;
}
