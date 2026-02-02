import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  let serviceAccount: any = null;
  try {
    const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
    console.log('DEBUG: Checking path:', serviceAccountPath);
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
      serviceAccount = JSON.parse(fileContent);
      console.log('DEBUG: Service account loaded');
    }
  } catch (err) {
    console.error("DEBUG: Failed to load service account:", err);
  }

  return NextResponse.json({
    serviceAccountLoaded: !!serviceAccount,
    email: serviceAccount?.client_email || "NOT LOADED",
    keyLength: serviceAccount?.private_key?.length || 0,
    keyStart: serviceAccount?.private_key?.substring(0, 50) || "N/A",
    hasBegin: serviceAccount?.private_key?.includes("BEGIN PRIVATE KEY") || false,
    hasEnd: serviceAccount?.private_key?.includes("END PRIVATE KEY") || false,
    hasNewlines: serviceAccount?.private_key?.includes("\n") || false,
  });
}
