/**
 * n8n Webhook Integration Service
 * Sends notifications to n8n for WhatsApp messaging
 */

const axios = require('axios');
const { getTrackingUrl } = require('../utils/qrCode');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_ENABLED = process.env.N8N_ENABLED === 'true';

/**
 * Send data to n8n webhook
 * @param {object} data - Data to send
 * @returns {Promise<boolean>} Success status
 */
async function sendToN8N(data) {
  if (!N8N_ENABLED || !N8N_WEBHOOK_URL) {
    console.log('n8n webhook is disabled or URL not configured');
    return false;
  }

  try {
    const response = await axios.post(N8N_WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('n8n webhook response:', response.status);
    return true;
  } catch (error) {
    console.error('Error sending to n8n:', error.message);
    // Don't throw error - n8n is optional
    return false;
  }
}

/**
 * Send new repair notification
 * @param {object} repair - Repair object
 * @returns {Promise<boolean>}
 */
async function notifyNewRepair(repair) {
  const trackingUrl = getTrackingUrl(repair.repairId);

  return await sendToN8N({
    action: 'new_repair',
    repairId: repair.repairId,
    customer: repair.customerName,
    phone: repair.phone,
    device: repair.device,
    issue: repair.issue,
    branch: repair.branch,
    warranty: repair.warranty ? 'نعم' : 'لا',
    cost: repair.estimatedCost ? repair.estimatedCost.toString() : 'غير محدد بعد',
    date: repair.receivedDate.toISOString().split('T')[0],
    qrCodeUrl: repair.qrCodeUrl,
    imageUrl: repair.imageUrl || '',
    status: repair.status,
    trackingUrl: trackingUrl
  });
}

/**
 * Send status update notification
 * @param {object} repair - Updated repair object
 * @param {string} arabicStatus - Arabic status text
 * @param {string} notes - Optional notes
 * @returns {Promise<boolean>}
 */
async function notifyStatusUpdate(repair, arabicStatus, notes = '') {
  const trackingUrl = getTrackingUrl(repair.repairId);

  // Determine webhook action based on status
  let webhookAction = 'status_update';

  const statusMap = {
    'REPAIR_COMPLETE': 'repair_completed',      // مكتمل الصيانة
    'UNREPAIRABLE': 'repair_unrepairable',      // غير قابل للصيانة
    'READY_FOR_PICKUP': 'ready_for_pickup'      // جاهز للاستلام
  };

  if (statusMap[repair.status]) {
    webhookAction = statusMap[repair.status];
  }

  return await sendToN8N({
    action: webhookAction,
    repairId: repair.repairId,
    status: arabicStatus,
    customer: repair.customerName,
    phone: repair.phone,
    device: repair.device,
    branch: repair.branch,
    cost: repair.estimatedCost ? repair.estimatedCost.toString() : 'غير محدد',
    notes: notes,
    trackingUrl: trackingUrl
  });
}

module.exports = {
  sendToN8N,
  notifyNewRepair,
  notifyStatusUpdate
};
