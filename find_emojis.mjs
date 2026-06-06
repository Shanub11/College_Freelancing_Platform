import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir);

// Simple regex to match emoji characters (common ones used in web pages)
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

files.forEach(file => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  const filePath = path.join(componentsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const matches = [];
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line) || line.includes('â') || line.includes('ð') || line.includes('Γ')) {
      matches.push({ lineNum: idx + 1, content: line.trim() });
    }
  });
  
  if (matches.length > 0) {
    console.log(`\n=== File: ${file} ===`);
    matches.forEach(m => {
      console.log(`  Line ${m.lineNum}: ${m.content}`);
    });
  }
});
