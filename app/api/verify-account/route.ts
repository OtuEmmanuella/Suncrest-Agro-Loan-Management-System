// app/api/verify-account/route.ts
import { NextResponse } from 'next/server';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Nigerian bank codes for Paystack
const BANK_CODES: { [key: string]: string } = {
  'access': '044',
  'gtbank': '058',
  'firstbank': '011',
  'uba': '033',
  'zenith': '057',
  'fidelity': '070',
  'union': '032',
  'sterling': '232',
  'stanbic': '221',
  'fcmb': '214',
  'ecobank': '050',
  'wema': '035',
  'unity': '215',
  'keystone': '082',
  'polaris': '076',
  'providus': '101',
  'kuda': '50211',
  'opay': '999992',
  'palmpay': '999991',
  'moniepoint': '50515',
};

export async function POST(request: Request) {
  try {
    const { account_number, bank_name } = await request.json();

    // Validate inputs
    if (!account_number || !bank_name) {
      return NextResponse.json(
        { error: 'Account number and bank name are required' },
        { status: 400 }
      );
    }

    if (account_number.length !== 10) {
      return NextResponse.json(
        { error: 'Account number must be 10 digits' },
        { status: 400 }
      );
    }

    // Get bank code
    const bank_code = BANK_CODES[bank_name];
    if (!bank_code) {
      return NextResponse.json(
        { error: 'Invalid bank selected' },
        { status: 400 }
      );
    }

    // Call Paystack API
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { 
          error: data.message || 'Could not verify account. Please check the account number and bank.' 
        },
        { status: 400 }
      );
    }

    // Return verified account details
    return NextResponse.json({
      account_name: data.data.account_name,
      account_number: data.data.account_number,
      bank_name: bank_name,
    });

  } catch (error: any) {
    console.error('Bank verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account. Please try again.' },
      { status: 500 }
    );
  }
}