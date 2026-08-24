// Comprehensive email validation and temporary/disposable domain blocklist

const DISPOSABLE_DOMAINS = new Set([
  // Popular temporary email services
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "yopmail.com",
  "yopmail.net",
  "yopmail.fr",
  "dispostable.com",
  "getairmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "fakeinbox.com",
  "burnermail.io",
  "crazymailing.com",
  "mohmal.com",
  "nada.ltd",
  "getnada.com",
  "inboxkitten.com",
  "dropmail.me",
  "mytemp.email",
  "tempmailaddress.com",
  "minuteinbox.com",
  "emailondeck.com",
  "tempinbox.com",
  "fakemailgenerator.com",
  "generator.email",
  "maildrop.cc",
  "harakirimail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "einrot.com",
  "inreach.site",
  "mailcatch.com",
  "mailnesia.com",
  "mytempemail.com",
  "spambog.com",
  "spamex.com",
  "spamfree24.org",
  "trashymail.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
]);

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email address is required." };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic RFC-compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please provide a valid email address (e.g. name@domain.com)." };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid email format." };
  }

  const domain = parts[1];

  // Disallow localhost or missing TLD
  if (!domain.includes(".") || domain.endsWith(".")) {
    return { valid: false, error: "Email domain must have a valid top-level domain." };
  }

  // Check against disposable blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: "Temporary and disposable email addresses are not allowed. Please use a permanent email address.",
    };
  }

  return { valid: true };
}
