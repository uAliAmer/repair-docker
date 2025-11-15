/**
 * QR Code Generator
 * Uses QuickChart.io API (same as Google Apps Script version)
 */

/**
 * Generate QR code URL for a repair ID
 * @param {string} repairId - Repair ID to encode
 * @returns {string} QR code image URL
 */
function generateQRCodeUrl(repairId) {
  const qrData = encodeURIComponent(repairId);
  const qrSize = 200; // Size in pixels
  const baseUrl = process.env.QR_CODE_BASE_URL || 'https://quickchart.io/qr';

  return `${baseUrl}?text=${qrData}&size=${qrSize}`;
}

/**
 * Get tracking URL for a repair
 * @param {string} repairId - Repair ID
 * @returns {string} Public tracking URL
 */
function getTrackingUrl(repairId) {
  const baseUrl = process.env.PUBLIC_TRACKING_URL || 'https://fix.nixflow.xyz/track';
  return `${baseUrl}?id=${encodeURIComponent(repairId)}`;
}

module.exports = {
  generateQRCodeUrl,
  getTrackingUrl
};
