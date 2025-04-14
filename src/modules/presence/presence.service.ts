import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as moment from 'moment';
import { Presence_Status } from '@prisma/client';
import { ResponseUtil } from 'src/common/utils/response.util';
import { paginateOrFindAll } from '../../common/utils/pagination.helper'; 

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async handlePointage(empreinte: string) {
    console.log('Début du pointage...');
    const now = moment();
    console.log(`Heure actuelle du pointage: ${now.format('DD/MM/YYYY HH:mm:ss')}`);
    
    const agent = await this.prisma.agent.findUnique({
      where: { empreinte: empreinte },
    });
    if (!agent) throw new Error('Empreinte non reconnue.');
    console.log('Agent trouvé:', agent);
    
    const today = moment().startOf('day').toDate();
    console.log(`Date de pointage (début du jour): ${moment(today).format('DD/MM/YYYY')}`);
    
    const datePlanning = await this.prisma.datePlanning.findFirst({ 
      where: { 
        date: {
          lte: today 
        }
      },
      orderBy: {
        date: 'desc' 
      }
    });
    
    if (!datePlanning) throw new Error('Aucune date de planning trouvée pour la période actuelle.');
    console.log('Date planning de référence trouvée:', datePlanning);
    
    const startDate = moment(datePlanning.date);
    const endDate = moment(datePlanning.date).add(6, 'days');
    const isInPlanningPeriod = moment(today).isSameOrAfter(startDate) && moment(today).isSameOrBefore(endDate);
    
    if (!isInPlanningPeriod) {
      throw new Error('Aucun planning actif pour aujourd\'hui.');
    }
    
    console.log(`La date actuelle est dans la période de planning: du ${startDate.format('DD/MM/YYYY')} au ${endDate.format('DD/MM/YYYY')}`);
    
    // Trouver le planning de l'agent
    const planning = await this.prisma.planning.findFirst({
      where: { agent_id: agent.id, date_id: datePlanning.id },
    });
    if (!planning) throw new Error('Aucun planning trouvé pour cet agent.');
    console.log('Planning trouvé:', planning);
    
    // Chercher l'enregistrement de présence
    let presence = await this.prisma.presence.findFirst({
      where: { agent_id: agent.id, date: today },
    });
    
    // Si l'agent a déjà pointé son entrée (statut différent de absent), rediriger vers le dépointage
    if (presence && presence.status !== Presence_Status.absent) {
      console.log(`Agent déjà pointé avec le statut: ${presence.status}. Redirection vers le dépointage.`);
      // Rediriger vers la fonction de dépointage
      return this.handleDepointage(empreinte);
    }
    
    // Créer un enregistrement de présence s'il n'existe pas
    if (!presence) {
      presence = await this.prisma.presence.create({
        data: {
          agent_id: agent.id,
          heure_entre: planning.heure_entre,
          heure_sorti: null,
          status: Presence_Status.absent,
          date: today,
        },
      });
    }
    
    // S'assurer que heureEntre est correctement extraite de planning.heure_entre
    const heureEntre = moment(planning.heure_entre);
    console.log(`Heure d'entrée prévue: ${heureEntre.format('HH:mm:ss')}`);
    
    // Définir la fenêtre de pointage (1h avant à 2h après)
    const debutFenetre = moment(heureEntre).subtract(1, 'hours');
    const finFenetre = moment(heureEntre).add(2, 'hours');
    console.log(`Fenêtre autorisée: de ${debutFenetre.format('HH:mm:ss')} à ${finFenetre.format('HH:mm:ss')}`);
    console.log(`Heure actuelle pour la vérification: ${now.format('HH:mm:ss')}`);
    
    // Utiliser seulement les heures, minutes et secondes pour la comparaison
    // en ignorant la date
    const nowTimeOfDay = moment(now.format('HH:mm:ss'), 'HH:mm:ss');
    const debutFenetreTimeOfDay = moment(debutFenetre.format('HH:mm:ss'), 'HH:mm:ss');
    const finFenetreTimeOfDay = moment(finFenetre.format('HH:mm:ss'), 'HH:mm:ss');
    
    console.log(`Comparaison après extraction des heures uniquement:`);
    console.log(`- nowTimeOfDay: ${nowTimeOfDay.format('HH:mm:ss')}`);
    console.log(`- debutFenetreTimeOfDay: ${debutFenetreTimeOfDay.format('HH:mm:ss')}`);
    console.log(`- finFenetreTimeOfDay: ${finFenetreTimeOfDay.format('HH:mm:ss')}`);
    
    // Vérifier si l'heure actuelle est dans la fenêtre autorisée
    const isAfterStart = nowTimeOfDay.isSameOrAfter(debutFenetreTimeOfDay);
    const isBeforeEnd = nowTimeOfDay.isSameOrBefore(finFenetreTimeOfDay);
    
    console.log(`Résultat des comparaisons: isAfterStart=${isAfterStart}, isBeforeEnd=${isBeforeEnd}`);
    
    if (isAfterStart && isBeforeEnd) {
      let newStatus: Presence_Status = Presence_Status.present;
      
      // Vérifier si l'agent est en retard (plus de 10 minutes après l'heure prévue)
      const heureEntreTimeOfDay = moment(heureEntre.format('HH:mm:ss'), 'HH:mm:ss');
      const limitRetard = moment(heureEntreTimeOfDay).add(10, 'minutes');
      
      if (nowTimeOfDay.isAfter(limitRetard)) {
        newStatus = Presence_Status.retard;
        console.log(`Retard détecté: plus de 10 minutes après l'heure prévue`);
      }
      
      // Mettre à jour la présence
      await this.prisma.presence.update({
        where: { id: presence.id },
        data: { 
          status: newStatus, 
          heure_entre: now.toDate() 
        },
      });
      
      return ResponseUtil.success('Pointage réussi', { agent: agent.id, status: newStatus });
    } else {
      console.log(`Pointage refusé: l'heure actuelle ${now.format('HH:mm:ss')} est hors de la fenêtre autorisée`);
      console.log(`Heure actuelle: ${nowTimeOfDay.format('HH:mm:ss')}, Début: ${debutFenetreTimeOfDay.format('HH:mm:ss')}, Fin: ${finFenetreTimeOfDay.format('HH:mm:ss')}`);
      throw new Error('Pointage hors fenêtre autorisée.');
    }
  }
  async handleDepointage(empreinte: string) {
    console.log('Début du dépointage...');
    // Créer une nouvelle instance de moment pour l'heure actuelle
    const now = moment();
    console.log(`Heure actuelle du dépointage: ${now.format('DD/MM/YYYY HH:mm:ss')}`);
    
    // Trouver l'agent par son empreinte
    const agent = await this.prisma.agent.findUnique({
      where: { empreinte: empreinte },
    });
    if (!agent) throw new Error('Empreinte non reconnue.');
    console.log('Agent trouvé:', agent);
    
    // Obtenir la date d'aujourd'hui (sans l'heure)
    const today = moment().startOf('day').toDate();
    console.log(`Date de dépointage (début du jour): ${moment(today).format('DD/MM/YYYY')}`);
    
    // Trouver la date de planning de référence pour la semaine
    // On cherche la date de planning qui est le début de la semaine actuelle
    // ou une des dates de planning plus anciennes les plus proches
    const datePlanning = await this.prisma.datePlanning.findFirst({ 
      where: { 
        date: {
          lte: today // cherche les dates de planning inférieures ou égales à aujourd'hui
        }
      },
      orderBy: {
        date: 'desc' // prend la plus récente parmi celles qui sont <= aujourd'hui
      }
    });
    
    if (!datePlanning) throw new Error('Aucune date de planning trouvée pour la période actuelle.');
    console.log('Date planning de référence trouvée:', datePlanning);
    
    // Vérifier si aujourd'hui est dans la période de 7 jours du planning trouvé
    const startDate = moment(datePlanning.date);
    const endDate = moment(datePlanning.date).add(6, 'days');
    const isInPlanningPeriod = moment(today).isSameOrAfter(startDate) && moment(today).isSameOrBefore(endDate);
    
    if (!isInPlanningPeriod) {
      throw new Error('Aucun planning actif pour aujourd\'hui.');
    }
    
    console.log(`La date actuelle est dans la période de planning: du ${startDate.format('DD/MM/YYYY')} au ${endDate.format('DD/MM/YYYY')}`);
    
    // Trouver le planning de l'agent
    const planning = await this.prisma.planning.findFirst({
      where: { agent_id: agent.id, date_id: datePlanning.id },
    });
    if (!planning) throw new Error('Aucun planning trouvé pour cet agent.');
    console.log('Planning trouvé:', planning);
    
    // Vérifier l'existence d'un enregistrement de présence pour aujourd'hui
    const presence = await this.prisma.presence.findFirst({
      where: { agent_id: agent.id, date: today },
    });
    if (!presence) throw new Error('Aucun pointage d\'entrée trouvé pour cet agent aujourd\'hui.');
    
    // Si heure_sorti est déjà définie, l'agent a déjà dépointé
    if (presence.heure_sorti) {
      throw new Error('Cet agent a déjà dépointé aujourd\'hui.');
    }
    
    // S'assurer que heureSorti est correctement extraite de planning.heure_sorti
    const heureSorti = moment(planning.heure_sorti);
    console.log(`Heure de sortie prévue: ${heureSorti.format('HH:mm:ss')}`);
    
    // Définir la fenêtre de dépointage (15min avant à 30min après)
    const debutFenetre = moment(heureSorti).subtract(15, 'minutes');
    const finFenetre = moment(heureSorti).add(30, 'minutes');
    console.log(`Fenêtre de dépointage autorisée: de ${debutFenetre.format('HH:mm:ss')} à ${finFenetre.format('HH:mm:ss')}`);
    console.log(`Heure actuelle pour la vérification: ${now.format('HH:mm:ss')}`);
    
    // Utiliser seulement les heures, minutes et secondes pour la comparaison
    // en ignorant la date
    const nowTimeOfDay = moment(now.format('HH:mm:ss'), 'HH:mm:ss');
    const debutFenetreTimeOfDay = moment(debutFenetre.format('HH:mm:ss'), 'HH:mm:ss');
    const finFenetreTimeOfDay = moment(finFenetre.format('HH:mm:ss'), 'HH:mm:ss');
    
    console.log(`Comparaison après extraction des heures uniquement:`);
    console.log(`- nowTimeOfDay: ${nowTimeOfDay.format('HH:mm:ss')}`);
    console.log(`- debutFenetreTimeOfDay: ${debutFenetreTimeOfDay.format('HH:mm:ss')}`);
    console.log(`- finFenetreTimeOfDay: ${finFenetreTimeOfDay.format('HH:mm:ss')}`);
    
    // Vérifier si l'heure actuelle est dans la fenêtre autorisée
    const isAfterStart = nowTimeOfDay.isSameOrAfter(debutFenetreTimeOfDay);
    const isBeforeEnd = nowTimeOfDay.isSameOrBefore(finFenetreTimeOfDay);
    
    console.log(`Résultat des comparaisons: isAfterStart=${isAfterStart}, isBeforeEnd=${isBeforeEnd}`);
    
    if (isAfterStart && isBeforeEnd) {
      // Mettre à jour l'enregistrement de présence avec l'heure de sortie
      await this.prisma.presence.update({
        where: { id: presence.id },
        data: { 
          heure_sorti: now.toDate() 
        },
      });
      
      console.log(`Dépointage réussi à ${now.format('HH:mm:ss')}`);
      return ResponseUtil.success('Dépointage réussi', { agent: agent.id, heure_sorti: now.format('HH:mm:ss') });
    } else {
      console.log(`Dépointage refusé: l'heure actuelle ${now.format('HH:mm:ss')} est hors de la fenêtre autorisée`);
      console.log(`Heure actuelle: ${nowTimeOfDay.format('HH:mm:ss')}, Début: ${debutFenetreTimeOfDay.format('HH:mm:ss')}, Fin: ${finFenetreTimeOfDay.format('HH:mm:ss')}`);
      throw new Error('Dépointage hors fenêtre autorisée.');
    }
  }

  async createWeeklyPresence(testDate: Date) {
    console.log('Création des présences pour la date:', testDate);
    
    // Formater testDate pour ne garder que la date sans l'heure
    const dateFormatted = moment(testDate).format('YYYY-MM-DD');
    console.log('Date formatée pour recherche:', dateFormatted);
    
    const agents = await this.prisma.agent.findMany();
    console.log('Agents récupérés:', agents.length);
    
    const allDatePlannings = await this.prisma.datePlanning.findMany();
    
    // Trouver la datePlanning correspondant à la date formatée (sans heure)
    const datePlanning = allDatePlannings.find(dp => 
      moment(dp.date).format('YYYY-MM-DD') === dateFormatted
    );
    
    console.log('DatePlanning trouvée:', datePlanning);
    
    if (!datePlanning) {
      console.log('Dates disponibles dans la table:', 
        allDatePlannings.map(d => ({
          id: d.id,
          date: d.date,
          formatted: moment(d.date).format('YYYY-MM-DD')
        }))
      );
      
      throw new Error(`Aucune date de planning trouvée pour ${dateFormatted}.`);
    }
  
    let presencesCreees = 0;
  
    // Créer des présences pour chaque jour de la semaine à partir de datePlanning
    for (let i = 0; i < 7; i++) {
      const day = moment(datePlanning.date).add(i, 'days').toDate();
      const dateFormattedForDay = moment(day).format('YYYY-MM-DD');
      console.log(`Création des présences pour le jour: ${dateFormattedForDay}`);
  
      // Trouver le planning pour chaque agent pour chaque jour
      for (const agent of agents) {
        const planning = await this.prisma.planning.findFirst({
          where: {
            agent_id: agent.id,
            date_id: datePlanning.id,
          },
        });
        
        if (planning) {
          await this.prisma.presence.create({
            data: {
              agent_id: agent.id,
              heure_entre: planning.heure_entre,
              heure_sorti: null,
              status: Presence_Status.absent,
              date: day, 
            },
          });
          presencesCreees++;
        }
      }
    }
    
    console.log(`${presencesCreees} présences créées pour la période du ${dateFormatted} au ${moment(datePlanning.date).add(6, 'days').format('YYYY-MM-DD')}`);
    return presencesCreees;
}


  async generateStatistics(societeId: number, startDate: Date, endDate: Date) {
    return this.prisma.agent.findMany({
      where: { societe_gardinage_id: societeId },
      include: {
        user: true, // Charger les informations utilisateur
        presences: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        societe_gardinage: true, // Charger la société de gardiennage
      },
    }).then(agents => {
      return agents.map(agent => {
        const totalJours = agent.presences.length;
        const totalHeures = agent.presences.reduce((sum, p) => {
          if (!p.heure_sorti) return sum;
          return sum + (p.heure_sorti.getTime() - p.heure_entre.getTime()) / 3600000; // Convertir en heures
        }, 0);

        const retards = agent.presences.filter(p => p.status === 'retard').length;
        const absences = agent.presences.filter(p => p.status === 'absent').length;

        return {
          nom: `${agent.user.nom} ${agent.user.prenom}`,
          phone: agent.user.phone, // Ajout du numéro de téléphone
          societe: agent.societe_gardinage?.nom || "Non assigné", // Correction : societe_gardinage est maintenant chargé
          joursTravailles: totalJours,
          totalHeures: totalHeures.toFixed(2),
          retards,
          absences,
        };
      });
    });
  }

  async listerPresences(options?: {
    agentId?: number;
    societeId?: number;
    siteId?: number;
    dateDebut?: Date;
    dateFin?: Date;
    semaine?: number;     // Numéro de semaine de l'année
    mois?: number;        // Numéro du mois
    annee?: number;       // Année
    status?: Presence_Status;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const where: any = {};
    
    // Filtrage de base
    if (options?.agentId) {
      where.agent_id = options.agentId;
    }
    
    if (options?.status) {
      where.status = options.status;
    }
  
    // Filtrage par date
    where.date = {};
    
    // Si la semaine est spécifiée
    if (options?.semaine && options?.annee) {
      // Calculer la date de début et de fin de la semaine spécifiée
      const debutSemaine = this.getFirstDayOfWeek(options.annee, options.semaine);
      const finSemaine = new Date(debutSemaine);
      finSemaine.setDate(debutSemaine.getDate() + 6);
      
      where.date.gte = debutSemaine;
      where.date.lte = finSemaine;
    } 
    // Si le mois est spécifié
    else if (options?.mois && options?.annee) {
      const debutMois = new Date(options.annee, options.mois - 1, 1);
      const finMois = new Date(options.annee, options.mois, 0);
      
      where.date.gte = debutMois;
      where.date.lte = finMois;
    }
    // Filtrage par date spécifique
    else if (options?.dateDebut || options?.dateFin) {
      if (options.dateDebut) {
        where.date.gte = options.dateDebut;
      }
      if (options.dateFin) {
        where.date.lte = options.dateFin;
      }
    } else {
      // Si aucune date spécifiée, on retire la contrainte de date
      delete where.date;
    }
    
    // Si société définie, on filtre par relation imbriquée
    if (options?.societeId) {
      where.agent = {
        societe_gardinage_id: options.societeId
      };
    }
  
    // Optimisation du filtrage par site
    const include: any = {
      agent: {
        include: {
          user: true,
          societe_gardinage: true
        }
      }
    };
  
    // Si on filtre par site, on peut optimiser la requête en incluant seulement les plannings du site
    if (options?.siteId) {
      include.agent.include.plannings = {
        where: {
          site_id: options.siteId
        },
        include: {
          site: true,
          date: true
        }
      };
    } else {
      include.agent.include.plannings = {
        include: {
          site: true,
          date: true
        }
      };
    }
  
    const orderBy = {
      date: 'desc' as const
    };
  
    const findOptions = { where, include, orderBy };
    
    try {
      const result = await paginateOrFindAll(this.prisma, 'presence', {
        page,
        limit,
        findOptions
      });
  
      // Si filtrage par site, on vérifie que l'agent est bien associé au site pendant la période de présence
      if (options?.siteId) {
        result.data = result.data.filter(presence => {
          // Vérifier si l'agent a au moins un planning sur ce site à la date de la présence
          return presence.agent.plannings.some(p => {
            const planningDate = new Date(p.date.date);
            const presenceDate = new Date(presence.date);
            return p.site_id === options.siteId && 
                   planningDate.getFullYear() === presenceDate.getFullYear() &&
                   planningDate.getMonth() === presenceDate.getMonth() &&
                   planningDate.getDate() === presenceDate.getDate();
          });
        });
        
        // Mise à jour des données de pagination si filtrage post-requête
        if (result.paginated) {
          result.total = result.data.length;
          result.lastPage = Math.ceil(result.total / limit);
          result.from = result.total > 0 ? (page - 1) * limit + 1 : 0;
          result.to = Math.min(page * limit, result.total);
          result.hasNextPage = page < result.lastPage;
          result.hasPreviousPage = page > 1;
        }
      }
  
      return {
        ...result,
        data: this.formatterResultatsPresence(result.data),
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des présences:', error);
      throw new Error('Impossible de récupérer les présences');
    }
  }


  async marquerCommeAbsent(presenceId: number, raisonJustification?: string) {
    try {
      // Vérifier si la présence existe
      const presence = await this.prisma.presence.findUnique({
        where: { id: presenceId }
      });
      if (!presence) {
        throw new Error('Présence non trouvée');
      }
      
      // Préparer les données à mettre à jour
      const updateData: any = {
        status: Presence_Status.absent,
        justifiable: raisonJustification ? true : false,
      };
      
      // Ajouter la raison de justification seulement si elle est fournie
      if (raisonJustification) {
        updateData.raison_justification = raisonJustification;
      } else {
        updateData.raison_justification = '';  // ou une valeur par défaut appropriée
      }
      
      // Utiliser la méthode unset de Prisma pour les champs à mettre à null
      if (presence.heure_entre) {
        updateData.heure_entre = undefined;  // Ceci indique à Prisma de désaffecter la valeur
      }
      
      if (presence.heure_sorti) {
        updateData.heure_sorti = undefined;  // Ceci indique à Prisma de désaffecter la valeur
      }
      
      // Mettre à jour le statut de la présence
      const presenceUpdated = await this.prisma.presence.update({
        where: { id: presenceId },
        data: updateData
      });
      
      return ResponseUtil.success('Employé marqué comme absent', presenceUpdated);
    } catch (error) {
      console.error('Erreur lors du marquage comme absent:', error);
      throw new Error('Impossible de marquer l\'employé comme absent');
    }
  }

  async getDetailPresence(presenceId: number) {
    try {
      // Récupérer la présence avec toutes les relations nécessaires
      const presence = await this.prisma.presence.findUnique({
        where: { id: presenceId },
        include: {
          agent: {
            include: {
              user: true,
              plannings: {
                include: {
                  site: true,
                  date: true
                }
              }
            }
          }
        }
      });
      if (!presence) {
        throw new Error('Présence non trouvée');
      }
      // Trouver le planning correspondant à la date de la présence
      const datePresence = moment(presence.date).format('YYYY-MM-DD');
      const planning = presence.agent.plannings.find(p => 
        moment(p.date.date).format('YYYY-MM-DD') === datePresence ||
        (moment(p.date.date).isSameOrBefore(moment(datePresence)) && 
         moment(p.date.date).add(6, 'days').isSameOrAfter(moment(datePresence)))
      );
      if (!planning) {
        throw new Error('Planning non trouvé pour cette date');
      }
      // Calculer les écarts d'horaires
      const heureEntreeFixee = moment(planning.heure_entre);
      const heureSortieFixee = moment(planning.heure_sorti);
      
      const heureEntreeReelle = presence.heure_entre ? moment(presence.heure_entre) : null;
      const heureSortieReelle = presence.heure_sorti ? moment(presence.heure_sorti) : null;
      
      // Calculer l'écart d'entrée en minutes
      let ecartEntree: number | null = null;
      let statusEntree: string | null = null;
      if (heureEntreeReelle) {
        ecartEntree = heureEntreeReelle.diff(heureEntreeFixee, 'minutes');
        statusEntree = ecartEntree <= 0 ? 'Avance' : 'Retard';
      }
      
      // Calculer l'écart de sortie en minutes
      let ecartSortie: number | null = null;
      let statusSortie: string | null = null;
      if (heureSortieReelle) {
        ecartSortie = heureSortieReelle.diff(heureSortieFixee, 'minutes');
        statusSortie = ecartSortie >= 0 ? 'Départ tardif' : 'Départ précoce';
      }
      
      // Calculer la durée de présence
      let dureePresence: string | null = null;
      if (heureEntreeReelle && heureSortieReelle) {
        const dureeMs = heureSortieReelle.diff(heureEntreeReelle);
        const duree = moment.duration(dureeMs);
        dureePresence = `${duree.hours()}h ${duree.minutes()}m`;
      }
      // Formater le résultat final
      return {
        id: presence.id,
        date: moment(presence.date).format('DD/MM/YYYY'),
        agent: {
          id: presence.agent.id,
          matricule: presence.agent.id.toString().padStart(6, '0'), // Simuler un matricule
          nom: presence.agent.user.nom,
          prenom: presence.agent.user.prenom,
          telephone: presence.agent.user.phone,
          email: presence.agent.email || '',
          code_pin: presence.agent.code_pin || '',
          genre: 'Non spécifié', // Cette info n'existe pas dans votre schéma
          num_declaration: `${Math.floor(Math.random() * 900000000) + 100000000}`, // Simuler un numéro
          empreinte: presence.agent.empreinte
        },
        site: planning.site ? {
          id: planning.site.id,
          nom: planning.site.nom_site
        } : null,
        statut: presence.status,
        entree: {
          reelle: heureEntreeReelle ? heureEntreeReelle.format('HH:mm') : null,
          fixee: heureEntreeFixee.format('HH:mm'),
          ecart: ecartEntree !== null ? Math.abs(ecartEntree) : null,
          status: statusEntree,
        },
        sortie: {
          reelle: heureSortieReelle ? heureSortieReelle.format('HH:mm') : null,
          fixee: heureSortieFixee.format('HH:mm'),
          ecart: ecartSortie !== null ? Math.abs(ecartSortie) : null,
          status: statusSortie,
        },
        duree: dureePresence,
        justifiable: presence.justifiable || false,
        raison_justification: presence.raison_justification || ''
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de présence:', error);
      throw new Error('Impossible de récupérer les détails de présence');
    }
  }
  
  // Fonction utilitaire pour obtenir le premier jour d'une semaine donnée dans l'année
  private getFirstDayOfWeek(year: number, week: number): Date {
    // Le 4 janvier est toujours dans la première semaine de l'année selon ISO 8601
    const januaryFourth = new Date(year, 0, 4);
    const dayOfWeek = januaryFourth.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Trouver le premier lundi de la première semaine
    const firstMonday = new Date(year, 0, 4 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    // Ajouter les semaines nécessaires
    const result = new Date(firstMonday);
    result.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    return result;
  }
  
  // Méthode pour formater les résultats de présence

  

  // Méthode utilitaire pour formater les résultats
  private formatterResultatsPresence(presences: any[]) {
    return presences.map(presence => {
      // Vérifier si presence.agent.plannings existe et n'est pas undefined
      if (!presence.agent || !presence.agent.plannings) {
        console.warn('Agent ou plannings manquants pour la présence:', presence.id);
      }
      
      // Utiliser une approche défensive avec des vérifications nulles
      const planningsActifs = presence.agent?.plannings
        ?.filter(p => p.date && p.date.date && moment(p.date.date).add(6, 'days').isAfter(moment()))
        ?.sort((a, b) => moment(b.date.date).diff(moment(a.date.date))) || [];
      
      const siteActuel = planningsActifs.length > 0 ? planningsActifs[0].site : null;
      
      // Calculer la durée de présence si heure_sorti est disponible
      let dureePresence: string | null = null;
      if (presence.heure_entre && presence.heure_sorti) {
        const dureeMs = moment(presence.heure_sorti).diff(moment(presence.heure_entre));
        const duree = moment.duration(dureeMs);
        dureePresence = `${duree.hours()}h ${duree.minutes()}m`;
      }
      
      return {
        id: presence.id,
        date: presence.date ? moment(presence.date).format('DD/MM/YYYY') : null,
        agent: {
          id: presence.agent?.id,
          nom: presence.agent?.user?.nom || 'Inconnu',
          prenom: presence.agent?.user?.prenom || '',
          telephone: presence.agent?.user?.phone || '',
          empreinte: presence.agent?.empreinte || '',
          societe: presence.agent?.societe_gardinage?.nom || 'Non assigné'
        },
        site: siteActuel ? {
          id: siteActuel.id,
          nom: siteActuel.nom_site
        } : null,
        statut: presence.status,
        heure_entree: presence.heure_entre ? moment(presence.heure_entre).format('HH:mm:ss') : null,
        heure_sortie: presence.heure_sorti ? moment(presence.heure_sorti).format('HH:mm:ss') : null,
        duree: dureePresence
      };
    });
  }

}

