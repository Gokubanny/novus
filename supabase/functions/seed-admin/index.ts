import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const allowedEmail = (Deno.env.get('SEED_ADMIN_EMAIL') ?? 'omatulemarvellous@gmail.com').trim().toLowerCase()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Safety: this seeder only allows creating/updating ONE known admin account.
    if (email !== allowedEmail) {
      return new Response(JSON.stringify({ error: 'This endpoint only seeds the configured admin email.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let userId: string | null = null

    // Try to create the user
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      // If the user already exists, look it up and continue to role seeding.
      const msg = String((createError as { message?: string })?.message ?? '')
      const looksLikeExists = msg.toLowerCase().includes('already') && msg.toLowerCase().includes('registered')

      if (!looksLikeExists) throw createError

      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listError) throw listError

      const existing = listData.users.find((u) => (u.email ?? '').toLowerCase() === email)
      if (!existing) throw createError

      userId = existing.id
    } else {
      userId = created.user.id
    }

    if (!userId) throw new Error('Could not resolve user id')

    // Ensure the password matches what was provided (so this is truly a "seed" operation).
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })

    if (passwordError) throw passwordError

    // Ensure admin role exists for that user (idempotent)
    const { data: updatedRoles, error: updateError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId)
      .select('id')

    if (updateError) throw updateError

    if (!updatedRoles || updatedRoles.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })

      if (insertError) throw insertError
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

