import { NextResponse } from "next/server";
import { prismaTCE, prismaTECAIR, CompanyId } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, company } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query both company databases concurrently to verify credentials & roles
    const [userTCE, userTECAIR] = await Promise.all([
      prismaTCE.user
        .findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
          include: { role: true },
        })
        .catch((err) => {
          console.error("[Login] TCE DB query error:", err);
          return null;
        }),
      prismaTECAIR.user
        .findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
          include: { role: true },
        })
        .catch((err) => {
          console.error("[Login] TECAIR DB query error:", err);
          return null;
        }),
    ]);

    const tceMatch = Boolean(
      userTCE &&
      userTCE.isActive &&
      bcrypt.compareSync(password, userTCE.passwordHash)
    );

    const tecairMatch = Boolean(
      userTECAIR &&
      userTECAIR.isActive &&
      bcrypt.compareSync(password, userTECAIR.passwordHash)
    );

    if (!tceMatch && !tecairMatch) {
      // Log failed attempt where appropriate
      if (userTCE) {
        await prismaTCE.loginActivityLog.create({
          data: {
            userId: userTCE.id,
            email: cleanEmail,
            status: "FAILED",
            userAgent: req.headers.get("user-agent"),
            ipAddress: req.headers.get("x-forwarded-for"),
          },
        }).catch(() => {});
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Compile list of organizations this user has verified access to
    const availableCompanies: { id: CompanyId; name: string; role: string }[] = [];
    if (tceMatch && userTCE) {
      availableCompanies.push({
        id: "TCE",
        name: "TCE (Technicool Engineering)",
        role: userTCE.role.name,
      });
    }
    if (tecairMatch && userTECAIR) {
      availableCompanies.push({
        id: "TECAIR",
        name: "TECAIR Systems",
        role: userTECAIR.role.name,
      });
    }

    // Determine target company context
    let targetCompany: CompanyId;
    let requiresSelection = false;

    if (company && (company.toUpperCase() === "TECAIR" || company.toUpperCase() === "TCE")) {
      const requested = company.toUpperCase() as CompanyId;
      const hasAccess = availableCompanies.some((c) => c.id === requested);
      if (!hasAccess) {
        return NextResponse.json(
          { error: `You do not have authorization to access the ${requested} workspace.` },
          { status: 403 }
        );
      }
      targetCompany = requested;
    } else if (availableCompanies.length === 1) {
      targetCompany = availableCompanies[0].id;
    } else {
      // User has access to both workspaces and did not pre-select -> prompt with picker
      targetCompany = "TCE"; // Default active context
      requiresSelection = true;
    }

    const activeUser = targetCompany === "TECAIR" ? userTECAIR! : userTCE!;
    const activeDb = targetCompany === "TECAIR" ? prismaTECAIR : prismaTCE;

    const token = signToken({
      id: activeUser.id,
      email: activeUser.email,
      name: activeUser.name,
      company: targetCompany,
    });

    await activeDb.loginActivityLog.create({
      data: {
        userId: activeUser.id,
        email: activeUser.email,
        status: "SUCCESS",
        userAgent: req.headers.get("user-agent"),
        ipAddress: req.headers.get("x-forwarded-for"),
      },
    }).catch(() => {});

    const devEmailsEnv = process.env.DEVELOPER_EMAILS || "";
    const isDev =
      (activeUser.role.name.toLowerCase() === "admin" ||
        activeUser.role.name.toLowerCase() === "super admin") &&
      [
        "muhammad.murtaazaa@gmail.com",
        ...devEmailsEnv
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ].includes(activeUser.email.toLowerCase());

    const response = NextResponse.json({
      message: "Login successful",
      token,
      activeCompany: targetCompany,
      requiresCompanySelection: requiresSelection,
      availableCompanies,
      user: {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        role: activeUser.role.name,
        isDeveloper: isDev,
        company: targetCompany,
      },
    });

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https");

    // Set secure HTTP-only token cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    // Set active company cookie
    response.cookies.set("active_company", targetCompany, {
      httpOnly: false,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Login API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
