/**
 * whatsapp.js
 * -----------------------------------------------------------------
 * Helper utility to generate WhatsApp deep-links.
 * Desktop uses the native whatsapp:// protocol,
 * Mobile devices use the https://wa.me/ web link (which opens the app).
 * -----------------------------------------------------------------
 */

export function getWhatsAppLink(phone, text) {
  // Clean phone number (digits only)
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text || '');

  // Detect if the user is on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    // Desktop uses the native deep link format
    return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }
}
