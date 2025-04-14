-- CreateEnum
CREATE TYPE "Admin_Role" AS ENUM ('admin', 'super_admin');

-- CreateEnum
CREATE TYPE "Admin_Status" AS ENUM ('actif', 'inactif');

-- CreateEnum
CREATE TYPE "Societe_Status" AS ENUM ('actif', 'inactif');

-- CreateEnum
CREATE TYPE "Agent_Role" AS ENUM ('chef_post', 'agent_simple');

-- CreateEnum
CREATE TYPE "Agent_Status" AS ENUM ('actif', 'inactif');

-- CreateEnum
CREATE TYPE "Site_Status" AS ENUM ('actif', 'inactif');

-- CreateEnum
CREATE TYPE "Ronde_Status" AS ENUM ('approuve', 'non_approuve');

-- CreateEnum
CREATE TYPE "Presence_Status" AS ENUM ('present', 'absent', 'retard');

-- CreateEnum
CREATE TYPE "Horaire" AS ENUM ('matin', 'soir', 'nuit');

-- CreateEnum
CREATE TYPE "Demande_Absence_Status" AS ENUM ('accepter', 'refuser', 'en_attente');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "structure" VARCHAR(100),
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "role" "Admin_Role" NOT NULL DEFAULT 'admin',
    "status" "Admin_Status" NOT NULL DEFAULT 'actif',

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocieteGardinage" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "prenom" VARCHAR(100),
    "structure" VARCHAR(100),
    "contact" VARCHAR(100),
    "status" "Societe_Status" NOT NULL DEFAULT 'actif',

    CONSTRAINT "SocieteGardinage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "societe_gardinage_id" INTEGER,
    "empreinte" VARCHAR(255),
    "status" VARCHAR(50),
    "quota" DECIMAL(10,2),
    "code_pin" VARCHAR(50),
    "cumule_retard" DECIMAL(10,2),
    "email" VARCHAR(100),
    "role" "Agent_Role" NOT NULL DEFAULT 'agent_simple',
    "statut" "Agent_Status" NOT NULL DEFAULT 'inactif',

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "nom_region" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferVigile" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "ancien_site_id" INTEGER NOT NULL,
    "nouveau_site_id" INTEGER NOT NULL,
    "date_transfert" DATE NOT NULL,

    CONSTRAINT "TransferVigile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "nom_site" TEXT NOT NULL,
    "region_id" INTEGER NOT NULL,
    "status" "Site_Status" NOT NULL DEFAULT 'actif',

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batiment" (
    "id" SERIAL NOT NULL,
    "nom_batiment" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,

    CONSTRAINT "Batiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ronde" (
    "id" SERIAL NOT NULL,
    "qrcode" VARCHAR(255),
    "emplacement" VARCHAR(100),
    "agent_id" INTEGER,
    "site_id" INTEGER NOT NULL,
    "status" "Ronde_Status" NOT NULL DEFAULT 'non_approuve',

    CONSTRAINT "Ronde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "ronde_id" INTEGER,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "incident_id" INTEGER,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "heure_entre" TIMESTAMP(3) NOT NULL,
    "heure_sorti" TIMESTAMP(3),
    "status" "Presence_Status" NOT NULL DEFAULT 'absent',
    "date" DATE NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planning" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "site_id" INTEGER NOT NULL,
    "status" VARCHAR(50),
    "heure_entre" TIMESTAMP(3) NOT NULL,
    "heure_sorti" TIMESTAMP(3) NOT NULL,
    "horaire" "Horaire" NOT NULL,
    "date_id" INTEGER NOT NULL,

    CONSTRAINT "Planning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatePlanning" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "DatePlanning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeAbsence" (
    "id" SERIAL NOT NULL,
    "agent_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "Demande_Absence_Status" NOT NULL DEFAULT 'en_attente',

    CONSTRAINT "DemandeAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_user_id_key" ON "Admin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SocieteGardinage_email_key" ON "SocieteGardinage"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_user_id_key" ON "Agent"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Region_nom_region_key" ON "Region"("nom_region");

-- CreateIndex
CREATE UNIQUE INDEX "Site_nom_site_key" ON "Site"("nom_site");

-- CreateIndex
CREATE UNIQUE INDEX "Batiment_nom_batiment_key" ON "Batiment"("nom_batiment");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_societe_gardinage_id_fkey" FOREIGN KEY ("societe_gardinage_id") REFERENCES "SocieteGardinage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferVigile" ADD CONSTRAINT "TransferVigile_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferVigile" ADD CONSTRAINT "TransferVigile_ancien_site_id_fkey" FOREIGN KEY ("ancien_site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferVigile" ADD CONSTRAINT "TransferVigile_nouveau_site_id_fkey" FOREIGN KEY ("nouveau_site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batiment" ADD CONSTRAINT "Batiment_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronde" ADD CONSTRAINT "Ronde_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronde" ADD CONSTRAINT "Ronde_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_ronde_id_fkey" FOREIGN KEY ("ronde_id") REFERENCES "Ronde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planning" ADD CONSTRAINT "Planning_date_id_fkey" FOREIGN KEY ("date_id") REFERENCES "DatePlanning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAbsence" ADD CONSTRAINT "DemandeAbsence_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
