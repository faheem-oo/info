import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

function base64url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function GET() {
  try {
    const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
    const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
    const serviceAccount = JSON.parse(fileContent);

    // Create JWT manually to see the full error
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const headerEncoded = base64url(JSON.stringify(header));
    const payloadEncoded = base64url(JSON.stringify(payload));

    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signatureEncoded = base64url(sign.sign(serviceAccount.private_key, 'base64'));

    const jwt = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;

    console.log('JWT created, attempting token exchange...');

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Token exchange failed:', data);
      return NextResponse.json({
        success: false,
        error: data.error,
        errorDescription: data.error_description,
        status: response.status,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      accessToken: data.access_token?.substring(0, 50) + '...',
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    });
  } catch (error: any) {
    console.error('JWT exchange error:', error?.message);
    return NextResponse.json({
      success: false,
      error: error?.message,
    }, { status: 500 });
  }
}
