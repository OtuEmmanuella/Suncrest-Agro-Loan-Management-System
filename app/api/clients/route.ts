// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('session');
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, id_card_number } = body;

    // Get user ID from session (you'll need to decode the JWT or store it differently)
    // For now, we'll use a placeholder - you should get the actual user ID
    const { data: userData } = await supabase.auth.getUser(session.value);
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          full_name: name,
          phone_number: phone,
          address,
          id_card: id_card_number,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}