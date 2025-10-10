
export async function safeCall(fn) {
    try {
      return await fn();
    } catch (e) {
      // unwrap Embedly’s error message if present
      const msg    = e.response?.data?.message || e.message;
      const status = e.response?.status || 500;
      const err    = new Error(msg);
      err.status   = status;
      throw err;
    }
  }
  


