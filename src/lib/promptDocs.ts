import * as fs from 'fs';
import * as path from 'path';

const PROMPTS_DIR = path.resolve(process.cwd(), 'docs/prompts');

const readPromptDoc = (fileName: string): string => {
  const filePath = path.join(PROMPTS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt doc not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8').trim();
};

export const getDielineImageToJsonPrompt = () =>
  [
    readPromptDoc('dieline-image-to-json.md'),
    readPromptDoc('tuck-end-box-critical-parts.md'),
  ].join('\n\n---\n\n');

export const getDielineJsonToComponentPrompt = () =>
  readPromptDoc('dieline-json-to-component.md');