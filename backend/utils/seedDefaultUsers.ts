import User from "../models/User";
import { logger } from "../lib/logger";
import { hashPassword, isBcryptHash, isPasswordStrong } from "./password";

const defaultUsers = [
  {
    identifier: "admin",
    email: "admin@dict.gov.ph",
    firstName: "OIC Director",
    lastName: "Sanchez",
    name: "OIC Director Sanchez",
    role: "OIC Director",
    division: "PRAD",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    firstLogin: false,
  },
  {
    identifier: "jane.dela.cruz",
    email: "jane.dela.cruz@dict.gov.ph",
    firstName: "Jane",
    lastName: "Dela Cruz",
    name: "Jane Dela Cruz",
    role: "Division Chief",
    division: "PPDD",
    passwordEnv: "SEED_DIVISION_CHIEF_PASSWORD",
    firstLogin: false,
  },
  {
    identifier: "new.user",
    email: "new.user@dict.gov.ph",
    firstName: "New",
    lastName: "User",
    name: "New User",
    role: "Division Member",
    division: "PPMED",
    passwordEnv: "SEED_DIVISION_MEMBER_PASSWORD",
    firstLogin: false,
  },
] as const;

function readRequiredSeedPassword(envName: string): string {
  const password = process.env[envName];
  if (!password || !password.trim()) {
    throw new Error(`${envName} must be set for default user seeding.`);
  }

  if (!isPasswordStrong(password)) {
    throw new Error(`${envName} does not meet password strength requirements.`);
  }

  return password;
}

// Seed auth demo users once so frontend auth pages have backend parity.
const seedDefaultUsers = async (): Promise<void> => {
  const existingUsers = await User.find();

  for (const user of existingUsers) {
    const updates: Record<string, unknown> = {
      verified: true,
      firstLogin: false,
      status: "active",
    };

    if (!isBcryptHash(user.password)) {
      updates.password = await hashPassword(user.password);
    }

    await User.updateOne({ _id: user._id }, { $set: updates });
  }

  for (const defaultUser of defaultUsers) {
    const password = await hashPassword(readRequiredSeedPassword(defaultUser.passwordEnv));
    await User.updateOne(
      { identifier: defaultUser.identifier },
      {
        $set: {
          email: defaultUser.email,
          firstName: defaultUser.firstName,
          lastName: defaultUser.lastName,
          name: defaultUser.name,
          role: defaultUser.role,
          division: defaultUser.division,
          password,
          verified: true,
          firstLogin: false,
          status: "active",
        },
        $setOnInsert: {
          identifier: defaultUser.identifier,
        },
      },
      { upsert: true }
    );
  }

  logger.info({}, "Seeded and normalized default auth users");
};

export default seedDefaultUsers;
