// /utils/normalizePhoneNumber.js

/**
 * Normalize phone numbers by:
 * 1. Removing non-digit characters
 * 2. Stripping the leading '1' if present
 *
 * @param {string} phoneNumber - The raw phone number to normalize
 * @returns {string} - The normalized phone number
 */
function normalizePhoneNumber(phoneNumber) {
  // Ensure input is a string and remove all non-digit characters
  phoneNumber = phoneNumber?.toString().replace(/\D/g, "");

  // US country code: strip a leading 1 only from 11-digit numbers.
  if (phoneNumber.length === 11 && phoneNumber.startsWith("1")) {
    phoneNumber = phoneNumber.slice(1);
  }

  return phoneNumber;
}

module.exports = normalizePhoneNumber;
