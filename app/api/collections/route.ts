import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { csvParse } from 'd3-dsv';

export async function GET() {
  const csvPath = path.join(process.cwd(), 'backend', 'filtered_collections.csv');
  const text = fs.readFileSync(csvPath, 'utf-8');
  const records = csvParse(text);
  const data = records.map((rec: any) => {
    const info = JSON.parse(rec.general_info);
    const stats = JSON.parse(rec.stats);
    const floor = stats.total.floor_price as number;
    const avg = stats.total.average_price as number;
    const change = avg ? ((floor - avg) / avg) * 100 : 0;
    return {
      name: info.name as string,
      image: info.image_url as string,
      floorEth: floor,
      change24hPct: Math.round(change * 100) / 100,
      link: info.opensea_url as string | undefined,
    };
  });
  return NextResponse.json(data);
}
