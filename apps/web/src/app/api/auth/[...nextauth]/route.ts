import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isSignUp: { label: "Sign Up", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const normalizedEmail = credentials.email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // 1. Sign Up (Registration) -> Requires OTP Verification
        if (credentials.isSignUp === "true") {
          if (existingUser) {
            throw new Error("An account with this email already exists. Please sign in instead.");
          }

          if (!credentials.otp) {
            throw new Error("6-digit verification code is required for registration.");
          }

          const storedToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: normalizedEmail,
              token: credentials.otp.trim(),
              expires: { gt: new Date() },
            },
          });

          if (!storedToken) {
            throw new Error("Invalid or expired 6-digit verification code.");
          }

          // Consume OTP token
          await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedEmail },
          });

          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          const user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              password: hashedPassword,
              emailVerified: new Date(),
              authToken: crypto.randomBytes(32).toString("hex"),
            },
          });
          return user;
        }

        // 2. Existing User Sign In -> Direct Email + Password (No OTP Required)
        if (!existingUser || !existingUser.password) {
          throw new Error("Invalid email or password.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, existingUser.password);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password.");
        }

        return existingUser;
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/auth/signin"
  },
  callbacks: {
    async jwt({ token, user, account, profile }: { token: any, user?: any, account?: any, profile?: any }) {
      // On first sign-in, user object is available — look up or create the DB user
      if (user || account) {
        const email = token.email ?? user?.email;
        if (email) {
          try {
            // Upsert: find by email or create — this handles Google OAuth without adapter
            const dbUser = await prisma.user.upsert({
              where: { email },
              update: {
                name: token.name ?? user?.name ?? null,
                image: token.picture ?? user?.image ?? null,
              },
              create: {
                email,
                name: token.name ?? user?.name ?? null,
                image: token.picture ?? user?.image ?? null,
                authToken: crypto.randomBytes(32).toString('hex'),
              },
            });
            
            // If existing user has no auth token, generate one
            if (!dbUser.authToken) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { authToken: crypto.randomBytes(32).toString('hex') }
              });
            }

            token.id = dbUser.id;
          } catch (e) {
            console.error("[jwt callback] Failed to upsert user:", e);
          }
        }
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
