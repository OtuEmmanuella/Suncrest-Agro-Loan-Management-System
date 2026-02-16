// app/api/loans/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stats = searchParams.get('stats');
    const limit = searchParams.get('limit');

    if (stats === 'true') {
      // Fetch dashboard stats
      const { data: loans } = await supabase
        .from('loans')
        .select('*');

      const { data: clients } = await supabase
        .from('clients')
        .select('id');

      const totalDisbursed = loans
        ?.filter(l => l.status === 'disbursed' || l.status === 'completed')
        .reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

      const totalRepaid = loans?.reduce((sum, l) => sum + Number(l.total_paid || 0), 0) || 0;
      
      const pendingAmount = loans
        ?.filter(l => l.status === 'disbursed')
        .reduce((sum, l) => sum + (Number(l.total_due) - Number(l.total_paid || 0)), 0) || 0;

      return NextResponse.json({
        total_disbursed: totalDisbursed,
        total_repaid: totalRepaid,
        pending_amount: pendingAmount,
        total_clients: clients?.length || 0,
      });
    }

    // Fetch loans
    let query = supabase
      .from('loans')
      .select('*, clients(*)');

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}