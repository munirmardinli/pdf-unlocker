import { NextResponse } from 'next/server';
export const dynamic = 'force-static';

import packageJson from "../../../package.json"

export async function GET() {
  const SITE_URL = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://pdf.mardinli.dev";

  const healthStatus = {
    status: "UP",
    meta: {
      name: packageJson.name,
      version: packageJson.version,
      nodeVersion: process.version,
    },
    build: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    config: {
      siteUrl: SITE_URL,
    }
  };

  return new NextResponse(JSON.stringify(healthStatus, null, 2), {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}