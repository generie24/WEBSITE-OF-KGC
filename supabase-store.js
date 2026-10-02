const { createClient } = require('@supabase/supabase-js');

function createSupabaseStore() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    return { enabled: false };
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  function mapUser(row) {
    return {
      id: row.id,
      userId: row.user_id || null,
      role: row.role,
      name: row.name,
      company: row.company || '',
      email: row.email,
      phone: row.phone || '',
      password: row.password,
      isApproved: row.is_approved,
      status: row.status,
      createdAt: row.created_at
    };
  }

  function mapBooking(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      date: row.service_date || '',
      subsidiaries: row.subsidiaries || [],
      services: row.services || {},
      notes: row.notes || '',
      paymentMethod: row.payment_method || '',
      paymentMethodId: row.payment_method_id || null,
      status: row.status,
      createdAt: row.created_at,
      timestamp: row.timestamp,
      updatedAt: row.updated_at
    };
  }

  return {
    enabled: true,

    async listUsers() {
      const { data, error } = await client.from('users').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapUser);
    },

    async listPaymentMethods() {
      const { data, error } = await client.from('payment_methods')
        .select('id, code, name, description, is_active')
        .eq('is_active', true)
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async insertUser(user) {
      const { data, error } = await client.from('users').insert({
        id: user.id,
        role: user.role,
        name: user.name,
        company: user.company,
        email: user.email,
        phone: user.phone,
        password: user.password,
        is_approved: user.isApproved,
        status: user.status,
        created_at: user.createdAt
      }).select().single();
      if (error) throw error;
      return mapUser(data);
    },

    async updateUser(id, changes) {
      const patch = {};
      if (Object.prototype.hasOwnProperty.call(changes, 'isApproved')) patch.is_approved = changes.isApproved;
      if (Object.prototype.hasOwnProperty.call(changes, 'status')) patch.status = changes.status;
      const { data, error } = await client.from('users').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return mapUser(data);
    },

    async listBookings() {
      const { data, error } = await client.from('bookings').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapBooking);
    },

    async insertBooking(booking) {
      const [userResult, paymentResult] = await Promise.all([
        client.from('users').select('id').eq('email', booking.email).maybeSingle(),
        client.from('payment_methods').select('id').eq('name', booking.paymentMethod).maybeSingle()
      ]);
      if (userResult.error) throw userResult.error;
      if (paymentResult.error) throw paymentResult.error;

      const { data, error } = await client.from('bookings').insert({
        id: booking.id,
        user_id: userResult.data ? userResult.data.id : null,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service_date: booking.date || null,
        subsidiaries: booking.subsidiaries,
        services: booking.services,
        notes: booking.notes,
        payment_method: booking.paymentMethod,
        payment_method_id: paymentResult.data ? paymentResult.data.id : null,
        status: booking.status,
        created_at: booking.createdAt,
        timestamp: booking.timestamp
      }).select().single();
      if (error) throw error;
      return mapBooking(data);
    },

    async updateBooking(id, changes) {
      const { data, error } = await client.from('bookings').update({
        status: changes.status,
        updated_at: changes.updatedAt
      }).eq('id', id).select().single();
      if (error) throw error;
      return mapBooking(data);
    }
  };
}

module.exports = { createSupabaseStore };
