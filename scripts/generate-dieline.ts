/**
 * CLI script for generating dieline code from images
 * Run: npx tsx scripts/generate-dieline.ts
 */

import * as path from 'path';
import { generateAllDielines, saveGeneratedCode } from '../src/services/dielineGenerator';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: Please set ANTHROPIC_API_KEY environment variable');
    console.log('Usage: ANTHROPIC_API_KEY=your_key npx tsx scripts/generate-dieline.ts [imagesDir] [outputDir]');
    process.exit(1);
  }

  const imagesDir = path.resolve(process.argv[2] || 'src/assets/dieline-images');
  const outputDir = path.resolve(process.argv[3] || 'src/generated');

  const results = await generateAllDielines(imagesDir, apiKey);
  saveGeneratedCode(results, outputDir);

  console.log('✓ Done!');
}

main();
