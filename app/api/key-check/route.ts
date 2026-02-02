import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export async function GET() {
  try {
    let serviceAccount: any = null;
    const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
      serviceAccount = JSON.parse(fileContent);
    }

    const key = serviceAccount?.private_key;
    
    // Create a SHA256 hash of the key to verify integrity
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    // Check key format
    const startsCorrectly = key.startsWith('-----BEGIN PRIVATE KEY-----');
    const endsCorrectly = key.endsWith('-----END PRIVATE KEY-----\n');
    const hasCorrectNewlines = (key.match(/\n/g) || []).length > 20; // Should have many newlines
    
    return NextResponse.json({
      keyHash,
      keyLength: key.length,
      startsCorrectly,
      endsCorrectly,
      hasCorrectNewlines,
      newlineCount: (key.match(/\n/g) || []).length,
      keyPreview: key.substring(0, 100),
      keyEnd: key.substring(key.length - 50),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
