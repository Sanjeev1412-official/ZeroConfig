export function generateTypeScriptInterface(jsonString: string, interfaceName = "WebhookPayload"): string {
  try {
    const obj = JSON.parse(jsonString);
    if (!obj || typeof obj !== "object") return `type ${interfaceName} = any;`;
    
    let result = `export interface ${interfaceName} {\n`;
    
    for (const [key, value] of Object.entries(obj)) {
      result += `  ${key}: ${getType(value)};\n`;
    }
    
    result += `}\n`;
    return result;
  } catch (_) {
    return "// Invalid JSON payload - unable to generate interface";
  }
}

function getType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "any[]";
    return `${getType(value[0])}[]`;
  }
  if (typeof value === "object") {
    let result = "{\n";
    for (const [k, v] of Object.entries(value)) {
      result += `    ${k}: ${getType(v)};\n`;
    }
    result += "  }";
    return result;
  }
  return typeof value;
}

export function generateNextRouteHandler(interfaceString: string, interfaceName = "WebhookPayload"): string {
  return `import { NextResponse } from 'next/server';

${interfaceString}

export async function POST(req: Request) {
  try {
    const payload: ${interfaceName} = await req.json();
    
    // TODO: Process your webhook payload here
    console.log("Received webhook:", payload);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
`;
}
