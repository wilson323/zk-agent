/**
 * @file lib/services/user-service.ts
 * @description User service for handling business logic related to users.
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { db, enhancedDb, dbTransaction } from '../database/enhanced-database-manager';
import { z } from 'zod';
import type { HealthCheckResult } from '../types/health';

// Zod a validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

// Zod a validation schema for updating a user
const updateUserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
});

/**
 * Fetches a list of users with pagination and filtering.
 *
 * @param {object} options - The options for fetching users.
 * @param {object} options.where - The where clause for filtering.
 * @param {number} options.skip - The number of records to skip.
 * @param {number} options.limit - The maximum number of records to return.
 * @returns {Promise<[object[], number]>} A tuple containing the list of users and the total count.
 */
export const getUsers = async ({ where, skip, limit }: { where: object; skip: number; limit: number }) => {
  const [users, total] = await Promise.all([
    db?.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
      skip,
      take: limit,
    }),
    db?.user.count({ where }),
  ]);
  return { users, pagination: { total, page: Math.ceil(skip / limit) + 1, limit } };
};

/**
 * Creates a new user.
 *
 * @param {object} data - The user data.
 * @returns {Promise<object>} The created user.
 */
export const createUser = async (data: z.infer<typeof createUserSchema>) => {
  const { email } = data;
  const existingUser = await db?.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const newUser = await db?.user.create({
    data: {
      ...data,
      email: email.toLowerCase(),
      password: 'placeholder', // Add a placeholder password
    },
  });

  return newUser;
};

/**
 * Fetches a single user by their ID.
 *
 * @param {string} id - The user ID.
 * @returns {Promise<object | null>} The user object or null if not found.
 */
export const getUserById = async (id: string) => {
  const user = await db?.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      status: true,
      emailVerified: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const stats = await db?.usageStats.groupBy({
    by: ['agentType'],
    where: { userId: id },
    _count: { id: true },
  });

  return { user, stats };
};

/**
 * Updates a user's information.
 *
 * @param {string} id - The user ID.
 * @param {object} data - The data to update.
 * @returns {Promise<object>} The updated user.
 */
export const updateUser = async (id: string, data: z.infer<typeof updateUserSchema>) => {
    return dbTransaction(async (prisma) => {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          status: true,
          emailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return updatedUser;
    });
  };

/**
 * Deletes a user by their ID (soft delete).
 *
 * @param {string} id - The user ID.
 * @returns {Promise<void>}
 */
export const deleteUser = async (id: string) => {
  return dbTransaction(async (prisma) => {
    await prisma.user.update({
      where: { id },
      data: {
        status: 'DELETED',
        updatedAt: new Date(),
      },
    });
  });
};

export const checkHealth = async (): Promise<HealthCheckResult> => {
    try {
      await enhancedDb.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'UP',
        timestamp: new Date(),
        details: { database: 'Connected' },
      };
    } catch (error: any) {
      return {
        status: 'DOWN',
        timestamp: new Date(),
        details: { database: 'Disconnected' },
        error: error.message,
      };
    }
  };