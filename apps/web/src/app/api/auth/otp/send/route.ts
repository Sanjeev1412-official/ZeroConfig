import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/emailValidation";
import { sendOtpEmail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password, isSignUp } = await req.json();

    // 1. Email format and disposable validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Password validation
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }

    // 3. User existence check for registration
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (isSignUp && existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // 4. Generate cryptographically random 6-digit OTP code
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 5. Store OTP in database
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: otp,
        expires,
      },
    });

    // 6. Send real email via mailer
    const mailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
    });

    if (!mailResult.success && mailResult.error) {
      return NextResponse.json(
        { error: `Failed to deliver email: ${mailResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Please check your inbox (and spam folder).`,
    });
  } catch (error: any) {
    console.error("[OTP Send Error]", error);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
