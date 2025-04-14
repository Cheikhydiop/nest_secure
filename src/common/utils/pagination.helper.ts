import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
// pagination.helper.ts

export async function paginateOrFindAll<T extends keyof PrismaClient>(
  prisma: PrismaService,
  modelName: T,
  options?: {
    page?: number;
    limit?: number;
    findOptions?: any; // contient where, include, orderBy, etc.
  }
) {
  const model = prisma[modelName] as any;

  if (!model || !model.findMany) {
    throw new Error(`Le modèle ${String(modelName)} n'existe pas ou ne supporte pas findMany.`);
  }

  const { page, limit, findOptions = {} } = options || {};

  // Si pas de pagination demandée, on retourne tout
  if (!page || !limit) {
    const data = await model.findMany(findOptions);
    return {
      data,
      total: data.length,
      paginated: false,
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    model.findMany({
      skip,
      take: limit,
      ...findOptions,
    }),
    model.count({ where: findOptions.where }),
  ]);

  const lastPage = Math.ceil(total / limit);
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + limit, total);

  return {
    data,
    total,
    page,
    perPage: limit,
    lastPage,
    from,
    to,
    hasNextPage: page < lastPage,
    hasPreviousPage: page > 1,
    paginated: true,
  };
}

