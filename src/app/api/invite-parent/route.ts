import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verify caller is authenticated admin/staff
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (!caller || !['super_admin', 'staff'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { guardianId, email, fullName, schoolId } = await req.json()

  if (!guardianId || !email || !fullName || !schoolId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Ensure guardian belongs to same school
  if (schoolId !== caller.school_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Check if user with this email already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === email)

  if (existing) {
    // Use admin client — anon client blocked by RLS
    const { data: existingRecord } = await admin
      .from('users')
      .select('id, guardian_id')
      .eq('id', existing.id)
      .single()

    if (existingRecord) {
      // Update guardian_id if not linked yet
      if (!existingRecord.guardian_id) {
        await admin.from('users').update({ guardian_id: guardianId }).eq('id', existing.id)
      }
      // Send password reset email via configured SMTP
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
      })
      if (resetErr) console.error('[invite-parent] reset email failed:', resetErr)
      return NextResponse.json({ success: true, existing: true, message: 'Akaun dah ada. E-mel set semula kata laluan telah dihantar.' })
    }

    // Auth user exists but no users record — create it
    const { error: insertErr } = await admin.from('users').insert({
      id: existing.id,
      school_id: schoolId,
      guardian_id: guardianId,
      full_name: fullName,
      email,
      role: 'parent',
    })

    if (insertErr) {
      console.error('[invite-parent] INSERT existing user failed:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Akaun dikaitkan.' })
  }

  // Invite new user via Supabase Auth
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
    data: { full_name: fullName },
  })

  if (inviteErr || !invited?.user) {
    return NextResponse.json({ error: inviteErr?.message ?? 'Gagal hantar jemputan.' }, { status: 500 })
  }

  // Create users record
  const { error: insertErr } = await admin.from('users').insert({
    id: invited.user.id,
    school_id: schoolId,
    guardian_id: guardianId,
    full_name: fullName,
    email,
    role: 'parent',
  })

  if (insertErr) {
    console.error('[invite-parent] INSERT users failed:', insertErr)
    // Rollback — delete the auth user we just created
    await admin.auth.admin.deleteUser(invited.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Jemputan berjaya dihantar.' })
}
