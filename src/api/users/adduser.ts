// /app/api/users/add.ts

import { PrismaClient } from '@prisma/client'
import { Clerk } from '@clerk/clerk-sdk-node'

const prisma = new PrismaClient()
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY! })

export async function POST(req: Request) {
  const body = await req.json()
  const { firstName, lastName, email, role, status, photo } = body

  try {
    // 1. Create user in Clerk (sends email invitation)
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      publicMetadata: { role },
    })

    // 2. Create user in your database
    const dbUser = await prisma.users.create({
      data: {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Photo: photo,
        Role: role,
        Status: status,
        PasswordHash: '', // Clerk handles auth
      },
    })

    return Response.json({ message: 'User created', userId: dbUser.UserID })
  } catch (error) {
    console.error(error)
    return new Response('Failed to create user', { status: 500 })
  }
}
