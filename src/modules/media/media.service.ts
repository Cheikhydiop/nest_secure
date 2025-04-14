import { Injectable } from '@nestjs/common';
import { CloudinaryConfig } from '../../config/cloudinary.config';
import { UploadApiResponse } from 'cloudinary';
import { Express } from 'express';
import * as multer from 'multer';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface Media {
  id: number;
  type: string;
  url: string;
  incident_id: number | null;
}

@Injectable()
export class MediaService {
  constructor(
    private cloudinary: CloudinaryConfig,
    private prisma: PrismaService
  ) {}

  // Méthode pour vérifier si une chaîne est une URL valide
  isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Méthode pour vérifier si une chaîne est un chemin de fichier local
  isLocalFilePath(pathString: string): boolean {
    // Vérifier si la chaîne ressemble à un chemin de fichier
    return pathString.startsWith('/') || 
           pathString.startsWith('./') || 
           pathString.startsWith('../') ||
           /^[a-zA-Z]:\\/.test(pathString); // Pour les chemins Windows
  }

  // Méthode pour lire un fichier local
  async readLocalFile(filePath: string): Promise<Buffer> {
    try {
      console.log('Lecture du fichier local:', filePath);
      return await fs.promises.readFile(filePath);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier local:', error);
      throw new Error(`Impossible de lire le fichier local: ${error.message}`);
    }
  }

  // Méthode pour télécharger une image à partir d'une URL
  async downloadFileFromUrl(url: string): Promise<Buffer> {
    try {
      console.log('Téléchargement du fichier depuis l\'URL:', url);
      const response = await axios.default.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier depuis l\'URL:', error);
      throw new Error(`Impossible de télécharger le fichier depuis l'URL: ${error.message}`);
    }
  }

  // Méthode pour uploader un buffer sur Cloudinary
  async uploadBuffer(buffer: Buffer, originalFilename?: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      console.log('Upload du buffer vers Cloudinary en cours...');

      const uploadOptions: any = { resource_type: 'auto' };
      if (originalFilename) {
        uploadOptions.filename_override = path.basename(originalFilename);
      }

      // Envoi du buffer à Cloudinary
      this.cloudinary.instance.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Erreur d\'upload sur Cloudinary:', error);
            return reject(error);
          }
          if (!result) {
            console.error('Aucun résultat retourné par Cloudinary');
            return reject('Aucun résultat retourné par Cloudinary');
          }

          console.log('Upload réussi sur Cloudinary, URL:', result.secure_url);
          resolve(result);
        },
      ).end(buffer);
    });
  }

  // Méthode pour uploader un fichier sur Cloudinary
  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      console.log('Le fichier est manquant ou invalide');
      throw new Error('Le fichier est manquant ou invalide');
    }

    return this.uploadBuffer(file.buffer, file.originalname);
  }

  // Méthode pour uploader une URL directement sur Cloudinary
  async uploadUrlToCloudinary(url: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      console.log('Upload de l\'URL vers Cloudinary en cours...');

      // Envoi de l'URL à Cloudinary
      this.cloudinary.instance.uploader.upload(
        url,
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            console.error('Erreur d\'upload sur Cloudinary:', error);
            return reject(error);
          }
          if (!result) {
            console.error('Aucun résultat retourné par Cloudinary');
            return reject('Aucun résultat retourné par Cloudinary');
          }

          console.log('Upload réussi sur Cloudinary, URL:', result.secure_url);
          resolve(result);
        }
      );
    });
  }

  // Méthode pour créer un média dans la base de données avec l'URL de Cloudinary
  async createMedia(incidentId: number, data: { type: string; url: string }): Promise<Media> {
    console.log('Création du média dans la base de données avec l\'URL:', data.url);
    
    const media = await this.prisma.media.create({
      data: {
        type: data.type,
        url: data.url,
        incident: { connect: { id: incidentId } },
      },
    });

    console.log('Média créé dans la base de données:', media);

    return media;
  }

  // Méthode modifiée pour gérer les URLs ou les fichiers
  async uploadAndCreateMedia(incidentId: number, fileOrUrl: Express.Multer.File | string): Promise<Media> {
    console.log('Démarrage de l\'upload et création du média pour l\'incident:', incidentId);
  
    let uploadResult: UploadApiResponse;
    let type: string;
    
    // Déterminer si on a une URL, un fichier ou un chemin local
    if (typeof fileOrUrl === 'string') {
      if (this.isValidUrl(fileOrUrl)) {
        // Cas d'une URL valide
        uploadResult = await this.uploadUrlToCloudinary(fileOrUrl);
        
        // Déterminer le type de média approximativement à partir de l'extension de l'URL
        const url = fileOrUrl.toLowerCase();
        if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')) {
          type = 'image';
        } else if (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi')) {
          type = 'video';
        } else {
          type = 'document';
        }
      } else if (this.isLocalFilePath(fileOrUrl)) {
        // Cas d'un chemin de fichier local
        console.log('Chemin de fichier local détecté:', fileOrUrl);
        try {
          const buffer = await this.readLocalFile(fileOrUrl);
          uploadResult = await this.uploadBuffer(buffer, fileOrUrl);
          
          // Déterminer le type à partir de l'extension du fichier
          const ext = path.extname(fileOrUrl).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
            type = 'image';
          } else if (['.mp4', '.mov', '.avi', '.wmv'].includes(ext)) {
            type = 'video';
          } else {
            type = 'document';
          }
        } catch (error) {
          console.error('Erreur lors du traitement du fichier local:', error);
          throw new Error(`Erreur lors du traitement du fichier local: ${error.message}`);
        }
      } else {
        throw new Error('URL ou chemin de fichier invalide');
      }
    } else if (fileOrUrl?.buffer) {
      // Cas d'un fichier uploadé
      uploadResult = await this.uploadFile(fileOrUrl);
      
      // Déterminer le type de média en fonction du mimetype
      type = fileOrUrl.mimetype.startsWith('image/') ? 'image' : 
             fileOrUrl.mimetype.startsWith('video/') ? 'video' : 'document';
    } else {
      throw new Error('Format de fichier ou URL invalide');
    }
  
    // Vérifier que l'upload a bien retourné l'URL
    if (!uploadResult.secure_url) {
      console.error('L\'upload a échoué, l\'URL sécurisée n\'a pas été retournée.');
      throw new Error('L\'upload a échoué, l\'URL sécurisée n\'a pas été retournée.');
    }
    
    console.log('Type de média détecté:', type);
  
    // Créer le média dans la base de données en utilisant l'URL retournée par Cloudinary
    const media = await this.createMedia(incidentId, {
      type,
      url: uploadResult.secure_url,
    });
  
    console.log('Média créé avec succès pour l\'incident', incidentId, 'Média:', media);
  
    return media;
  }
  
  // Méthode pour récupérer les médias associés à un incident
  async getMediasByIncidentId(incidentId: number): Promise<Media[]> {
    console.log('Récupération des médias pour l\'incident', incidentId);
    
    const medias = await this.prisma.media.findMany({
      where: { incident_id: incidentId },
    });

    console.log('Médias récupérés:', medias);

    return medias;
  }

  // Méthode modifiée pour créer plusieurs médias à la fois avec détection d'URL et chemin local
  async createManyMedias(incidentId: number, medias: { type: string; url: string }[]): Promise<Media[]> {
    console.log('Création de plusieurs médias pour l\'incident', incidentId);

    if (!medias || medias.length === 0) {
      console.log('Aucun média à créer.');
      return [];
    }
    
    const createdMedias: Media[] = [];
    for (const mediaData of medias) {
      console.log('Traitement du média:', mediaData);
      
      try {
        // Vérifier si l'URL est une URL ou un chemin local qui doit être transférée vers Cloudinary
        if ((this.isValidUrl(mediaData.url) && !mediaData.url.includes('cloudinary.com')) || 
            this.isLocalFilePath(mediaData.url)) {
          
          console.log('URL externe ou chemin local détecté, transfert vers Cloudinary');
          // Uploader le média et utiliser la nouvelle URL Cloudinary
          let uploadResult: UploadApiResponse;
          
          if (this.isLocalFilePath(mediaData.url)) {
            // Cas d'un chemin de fichier local
            const buffer = await this.readLocalFile(mediaData.url);
            uploadResult = await this.uploadBuffer(buffer, mediaData.url);
          } else {
            // Cas d'une URL valide
            uploadResult = await this.uploadUrlToCloudinary(mediaData.url);
          }
          
          const createdMedia = await this.createMedia(incidentId, {
            type: mediaData.type,
            url: uploadResult.secure_url,
          });
          createdMedias.push(createdMedia);
        } else {
          // Si l'URL est déjà une URL Cloudinary, l'utiliser telle quelle
          const createdMedia = await this.createMedia(incidentId, mediaData);
          createdMedias.push(createdMedia);
        }
      } catch (error) {
        console.error(`Erreur lors du traitement du média ${mediaData.url}:`, error);
        // On continue avec les autres médias même si un échoue
      }
    }
    
    console.log('Médias créés:', createdMedias);
    return createdMedias;
  }
}