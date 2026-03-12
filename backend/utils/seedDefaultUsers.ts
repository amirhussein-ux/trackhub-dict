import User from "../models/User";

const defaultUsers = [
  {
    identifier: "admin",
    email: "admin@dict.gov.ph",
    name: "OIC Director Sanchez",
    role: "Admin",
    password: "Admin@1234",
    firstLogin: false,
  },
  {
    identifier: "jane.dela.cruz",
    email: "jane.dela.cruz@dict.gov.ph",
    name: "Jane Dela Cruz",
    role: "Policy Owner",
    password: "Secure@2025",
    firstLogin: false,
  },
  {
    identifier: "new.user",
    email: "new.user@dict.gov.ph",
    name: "New User",
    role: "Policy Access",
    password: "Temp@1234",
    firstLogin: true,
  },
] as const;

// Seed auth demo users once so frontend auth pages have backend parity.
const seedDefaultUsers = async (): Promise<void> => {
  const count = await User.countDocuments();
  if (count > 0) {
    return;
  }

  await User.insertMany(defaultUsers);
  console.log("Seeded default demo users.");
};

export default seedDefaultUsers;
