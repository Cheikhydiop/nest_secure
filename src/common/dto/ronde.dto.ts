// ronde.dto.ts
export class MediaDto {
    type: string;
    url: string;
  }
  
  export class IncidentDto {
    description?: string;
    type: string;
    medias?: MediaDto[];
  }
  
  import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

  export class CreateRondeDto {
    @IsOptional()
    @IsString()
    qrcode?: string;
  
    @IsOptional()
    @IsString()
    emplacement?: string;
  
    @IsOptional()
    @IsNumber()
    agent_id?: number;
  
    @IsNumber()
    site_id: number;
  
    @IsOptional()
    incident?: {
      description: string;
      type: string;
      medias: Array<{
        type: string;
        url: string;
      }>;
    };
  }
  