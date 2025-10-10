// src/services/embedlyCustomerService.js
import { customers } from '../transactions/embedlyClients.js';
import { safeCall }   from '../utilities/apiWrapper.js';

/**
 * Create a new Embedly customer
 * @param {Object} payload - Customer data as per Embedly API
 * @returns {Object} Newly created customer object
 */
export async function addCustomer(payload) {
  const res = await safeCall(() => customers.add(payload));
  return res.data.data;
}

/**
 * Retrieve an Embedly customer by ID
 * @param {string} id - Embedly customer ID
 * @returns {Object} Customer object
 */
export async function getCustomer(id) {
  const res = await safeCall(() => customers.get(id));
  return res.data.data;
}

/**
 * Update an existing Embedly customer
 * @param {string} id - Embedly customer ID
 * @param {Object} payload - Partial customer data to update
 * @returns {Object} Updated customer object
 */
export async function updateCustomer(id, payload) {
  const res = await safeCall(() => customers.update(id, payload));
  return res.data.data;
}
