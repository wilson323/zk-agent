/**
 * @file lib/services/auth-service.ts
 * @description Authentication service for handling user authentication and authorization.
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { db } from '@/lib/database';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken, verifyToken } from '@/lib/auth/token';
import { ApiResponseWrapper } from '@/lib/response';
import { ErrorCode } from '@/types/core';

// Zod validation schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Zod validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  avatar: z.string().optional(),
});

// Zod validation schema for password change
const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8),
});

/**
 * Handles user login.
 *
 * @param {object} data - The login data.
 * @returns {Promise<object>} The login result with tokens.
 */
export const login = async (data: z.infer<typeof loginSchema>) => {
  const { email, password } = data;

  const user = await db?.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      avatar: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password.');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active.');
  }

  // Update login stats
  await db?.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  const { accessToken, refreshToken } = await generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
    tokens: { accessToken, refreshToken },
  };
};

/**
 * Handles user registration.
 *
 * @param {object} data - The registration data.
 * @returns {Promise<object>} The registration result with tokens.
 */
export const register = async (data: z.infer<typeof registerSchema>) => {
  const { email, password, name, avatar } = data;

  const existingUser = await db?.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await db?.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      avatar,
      role: 'USER',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
    },
  });

  const { accessToken, refreshToken } = await generateToken(newUser);

  return {
    user: newUser,
    tokens: { accessToken, refreshToken },
  };
};

/**
 * Refreshes the access token using a refresh token.
 *
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise<object>} The new tokens.
 */
export const refreshToken = async (token: string) => {
  const payload = await verifyToken(token, 'refresh');
  if (!payload) {
    throw new Error('Invalid refresh token.');
  }

  const user = await db?.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new Error('User not found or inactive.');
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateToken(user);

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Changes a user's password.
 *
 * @param {string} userId - The user ID.
 * @param {object} data - The password change data.
 * @returns {Promise<void>}
 */
export const changePassword = async (userId: string, data: z.infer<typeof changePasswordSchema>) => {
  const { oldPassword, newPassword } = data;

  const user = await db?.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const isValidPassword = await verifyPassword(oldPassword, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid current password.');
  }

  const hashedPassword = await hashPassword(newPassword);

  await db?.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });
};