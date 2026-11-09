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
      userId: row.user_id || null,
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

  function mapNotification(row) {
    return {
      id: row.id,
      eventKey: row.event_key,
      recipientRole: row.recipient_role,
      recipientId: row.recipient_id || '',
      recipientEmail: row.recipient_email || '',
      type: row.type,
      title: row.title,
      body: row.body,
      bookingId: row.booking_id || '',
      createdAt: row.created_at,
      readAt: row.read_at || null
    };
  }

  return {
    enabled: true,

    async authenticateClient(accessToken) {
      const { data, error } = await client.auth.getUser(accessToken);
      if (error) throw error;
      if (!data.user || !data.user.email) throw new Error('Authenticated user has no email address.');
      return {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
        name: data.user.user_metadata && (data.user.user_metadata.name || data.user.user_metadata.full_name) || ''
      };
    },

    async authenticateWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user || !data.user.email) return null;
      return { id: data.user.id, email: data.user.email };
    },

    async createVerifiedClient(user) {
      const { data, error } = await client.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          full_name: user.name,
          company: user.company || '',
          phone: user.phone || '',
          role: 'client'
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return the created client account.');
      try {
        const result = await this.upsertClient({
          id: data.user.id,
          email: user.email,
          name: user.name,
          company: user.company || '',
          phone: user.phone || '',
          createdAt: data.user.created_at || new Date().toISOString()
        });
        return result.user;
      } catch (syncError) {
        const rollback = await client.auth.admin.deleteUser(data.user.id);
        if (rollback.error) {
          console.error('Unable to roll back un-synced Supabase Auth user:', rollback.error);
        }
        throw syncError;
      }
    },

    async findUsersByEmail(email) {
      const emailPattern = String(email || '').trim().toLowerCase().replace(/[\\%_]/g, '\\$&');
      const { data, error } = await client.from('users')
        .select('id, role, name, company, email, phone, password, is_approved, status, created_at')
        .ilike('email', emailPattern);
      if (error) throw error;
      return (data || []).map(mapUser);
    },

    async listUsers() {
      const { data, error } = await client.from('users').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapUser);
    },

    async listClientAccounts() {
      const { data, error } = await client.from('users')
        .select('id, role, name, company, email, phone, is_approved, status, created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name || '',
        company: row.company || '',
        email: row.email || '',
        phone: row.phone || '',
        isApproved: row.is_approved,
        status: row.status || '',
        createdAt: row.created_at || ''
      }));
    },

    async listCampaignBookingAssociations() {
      const { data, error } = await client.from('bookings').select('email, subsidiaries');
      if (error) throw error;
      return (data || []).map((row) => ({
        email: row.email || '',
        subsidiaries: Array.isArray(row.subsidiaries) ? row.subsidiaries : []
      }));
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

    // Upsert a client row by email after Supabase Auth signup.
    async upsertClient(user) {
      // Postgres `=` is case-SENSITIVE, so "User@x.com" would miss an existing
      // "user@x.com" row, then the insert would fail the unique constraint.
      const email = String(user.email || '').trim().toLowerCase();
      const emailPattern = email.replace(/[\\%_]/g, '\\$&');
      const existing = await client.from('users').select('id').ilike('email', emailPattern).limit(1);
      if (existing.error) throw existing.error;
      const existingRow = (existing.data || [])[0] || null;

      // Never include the primary key in an UPDATE: changing users.id would break
      // the bookings.user_id foreign key that points at it.
      const payload = {
        role: 'client',
        name: user.name,
        company: user.company || '',
        email: email,
        phone: user.phone || '',
        password: '',
        is_approved: true,
        status: 'Approved',
        created_at: user.createdAt
      };

      if (existingRow) {
        const { data, error } = await client.from('users').update(payload).eq('id', existingRow.id).select().single();
        if (error) throw error;
        // created:false tells the caller this was an update, not a new account —
        // without it the "welcome" email fired again on every profile sync.
        return { user: mapUser(data), created: false };
      }

      const { data, error } = await client.from('users')
        .insert(Object.assign({ id: user.id || ('USR' + Date.now()) }, payload))
        .select().single();
      if (error) throw error;
      return { user: mapUser(data), created: true };
    },

    async updateUser(id, changes) {
      const patch = {};
      if (Object.prototype.hasOwnProperty.call(changes, 'role')) patch.role = changes.role;
      if (Object.prototype.hasOwnProperty.call(changes, 'isApproved')) patch.is_approved = changes.isApproved;
      if (Object.prototype.hasOwnProperty.call(changes, 'status')) patch.status = changes.status;
      if (!Object.keys(patch).length) throw new Error('No supported account changes were provided.');
      const { data, error } = await client.from('users').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return mapUser(data);
    },

    async deleteUser(id) {
      const userId = String(id);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        const { error: authError } = await client.auth.admin.deleteUser(userId);
        if (authError) throw authError;
      }
      const { data, error } = await client.from('users')
        .delete()
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id } : null;
    },

    async listBookings() {
      const { data, error } = await client.from('bookings').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapBooking);
    },

    async listBookingMessages(bookingId) {
      const { data, error } = await client.from('booking_messages')
        .select('id, booking_id, sender_id, sender_role, sender_name, body, created_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async insertBookingMessage(message) {
      const { data, error } = await client.from('booking_messages').insert({
        booking_id: message.bookingId,
        sender_id: message.senderId,
        sender_role: message.senderRole,
        sender_name: message.senderName,
        body: message.body,
        created_at: message.createdAt
      }).select('id, booking_id, sender_id, sender_role, sender_name, body, created_at').single();
      if (error) throw error;
      return data;
    },

    async insertNotification(notification) {
      const { data, error } = await client.from('notifications').upsert({
        event_key: notification.eventKey,
        recipient_role: notification.recipientRole,
        recipient_id: notification.recipientId || null,
        recipient_email: notification.recipientEmail || '',
        type: notification.type,
        title: notification.title,
        body: notification.body,
        booking_id: notification.bookingId || null,
        created_at: notification.createdAt
      }, { onConflict: 'event_key', ignoreDuplicates: true })
        .select('id, event_key, recipient_role, recipient_id, recipient_email, type, title, body, booking_id, created_at, read_at')
        .maybeSingle();
      if (error) throw error;
      if (data) return mapNotification(data);
      const existing = await client.from('notifications')
        .select('id, event_key, recipient_role, recipient_id, recipient_email, type, title, body, booking_id, created_at, read_at')
        .eq('event_key', notification.eventKey)
        .single();
      if (existing.error) throw existing.error;
      return mapNotification(existing.data);
    },

    async listNotifications(role, recipientId, recipientEmail) {
      const columns = 'id, event_key, recipient_role, recipient_id, recipient_email, type, title, body, booking_id, created_at, read_at';
      const queries = [];
      if (recipientId) {
        queries.push(client.from('notifications').select(columns)
          .eq('recipient_role', role)
          .eq('recipient_id', String(recipientId))
          .order('created_at', { ascending: false }).limit(100));
      }
      if (recipientEmail) {
        queries.push(client.from('notifications').select(columns)
          .eq('recipient_role', role)
          .eq('recipient_email', String(recipientEmail).trim().toLowerCase())
          .order('created_at', { ascending: false }).limit(100));
      }
      const results = await Promise.all(queries);
      results.forEach((result) => { if (result.error) throw result.error; });
      return Array.from(new Map(results.flatMap((result) => result.data || [])
        .map((row) => [row.id, mapNotification(row)])).values())
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
        .slice(0, 100);
    },

    async markNotificationRead(id, readAt) {
      const { data, error } = await client.from('notifications')
        .update({ read_at: readAt })
        .eq('id', id)
        .select('id, event_key, recipient_role, recipient_id, recipient_email, type, title, body, booking_id, created_at, read_at')
        .maybeSingle();
      if (error) throw error;
      return data ? mapNotification(data) : null;
    },

    async insertBooking(booking) {
      const insertPayload = {
        id: booking.id,
        user_id: booking.userId || null,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service_date: booking.date || null,
        subsidiaries: booking.subsidiaries,
        services: booking.services,
        notes: booking.notes,
        payment_method: booking.paymentMethod,
        status: booking.status,
        created_at: booking.createdAt,
        timestamp: booking.timestamp
      };

      const { data, error } = await client.from('bookings').insert(insertPayload).select().single();
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
