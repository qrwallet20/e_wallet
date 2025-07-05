import {customers} from './embedlyClients';

async function addCustomer(body) {
  const res = await customers.add(body);
  return res.data;            // { statuscode, message, data: {...} }
}

async function listCustomers({ page, limit } = {}) {
  const res = await customers.list({ params: { page, limit } });
  return res.data;
}

async function getCustomer(id) {
  const res = await customers.get(id);
  return res.data;
}

async function updateCustomer(id, body) {
  const res = await customers.update(id, body);
  return res.data;
}

module.exports = {
  addCustomer,
  listCustomers,
  getCustomer,
  updateCustomer
};
