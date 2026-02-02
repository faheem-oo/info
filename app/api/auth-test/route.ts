import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const results = {
    serviceAccountCheck: {} as any,
    jwtTest: {} as any,
    fromJsonTest: {} as any,
  };

  try {
    // 1. Check JSON file
    const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
    let serviceAccount: any = null;
    
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
      serviceAccount = JSON.parse(fileContent);
      results.serviceAccountCheck = {
        found: true,
        email: serviceAccount.client_email,
        keyLength: serviceAccount.private_key?.length,
        hasBegin: serviceAccount.private_key?.includes("BEGIN PRIVATE KEY"),
        hasEnd: serviceAccount.private_key?.includes("END PRIVATE KEY"),
      };
    } else {
      results.serviceAccountCheck = { found: false, error: "File not found" };
    }

    // 2. Test JWT auth
    try {
      const jwtAuth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      
      // Try to get credentials
      const creds = await jwtAuth.authorize();
      results.jwtTest = {
        success: true,
        tokenType: creds?.token_type,
        expiresIn: creds?.expiry_date,
      };
    } catch (error: any) {
      results.jwtTest = {
        success: false,
        error: error?.message,
        code: error?.code,
      };
    }

    // 3. Test fromJSON auth
    try {
      const fromJsonAuth = google.auth.fromJSON(serviceAccount);
      const token = await fromJsonAuth.getAccessToken();
      results.fromJsonTest = {
        success: true,
        tokenType: "Bearer",
        expiresIn: "token received",
      };
    } catch (error: any) {
      results.fromJsonTest = {
        success: false,
        error: error?.message,
        code: error?.code,
      };
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message,
      results,
    }, { status: 500 });
  }

  return NextResponse.json(results);
}
