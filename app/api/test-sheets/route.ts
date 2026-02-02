import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    let serviceAccountJson: any = null;
    const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
      serviceAccountJson = JSON.parse(fileContent);
    }

    console.log('Using google.auth.fromJSON() method');
    
    // Use the proper fromJSON method
    const auth = google.auth.fromJSON(serviceAccountJson);
    auth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '124oDjjq8KjiDLobMwFV_tRYXZV_WX8aR1Yeq21mFhSM';

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return NextResponse.json({
      success: true,
      title: response.data.properties?.title,
      message: 'Successfully connected to Google Sheets!',
    });
  } catch (error: any) {
    console.error('Test API Error:', {
      message: error?.message,
      code: error?.code,
    });
    return NextResponse.json({
      success: false,
      error: error?.message,
      code: error?.code,
    }, { status: 500 });
  }
}
