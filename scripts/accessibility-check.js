#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Accessibility Checks...\n');

const readmePath = path.join(__dirname, '..', 'README.md');
const content = fs.readFileSync(readmePath, 'utf8');

// Accessibility checks
const checks = [
  {
    name: 'Semantic HTML Structure',
    test: () => {
      const hasH1 = content.includes('<h1');
      const hasH2 = content.includes('<h2');
      const hasH3 = content.includes('<h3');
      return hasH1 && hasH2 && hasH3;
    },
    description: 'Uses proper heading hierarchy (h1, h2, h3)'
  },
  {
    name: 'ARIA Labels',
    test: () => content.includes('aria-label') || content.includes('aria-labelledby'),
    description: 'Includes ARIA attributes for screen readers'
  },
  {
    name: 'Focus Management',
    test: () => content.includes(':focus') || content.includes('outline'),
    description: 'Includes focus styles for keyboard navigation'
  },
  {
    name: 'Color Contrast',
    test: () => content.includes('var(--primary-color)') && content.includes('var(--text-primary)'),
    description: 'Uses CSS variables for consistent color contrast'
  },
  {
    name: 'Reduced Motion Support',
    test: () => content.includes('prefers-reduced-motion'),
    description: 'Respects user motion preferences'
  },
  {
    name: 'High Contrast Support',
    test: () => content.includes('prefers-contrast'),
    description: 'Supports high contrast mode'
  },
  {
    name: 'Link Descriptions',
    test: () => {
      const links = content.match(/<a[^>]*>/g) || [];
      return links.every(link => 
        link.includes('aria-label') || 
        link.includes('alt=') ||
        link.match(/>[^<]+<\//) // has descriptive text content
      );
    },
    description: 'All links have descriptive text or ARIA labels'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const result = check.test();
  
  if (result) {
    console.log(`✅ ${check.name}`);
    console.log(`   ${check.description}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}`);
    console.log(`   ${check.description}`);
    failed++;
  }
  console.log('');
});

console.log('📊 Accessibility Check Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Score: ${Math.round((passed / checks.length) * 100)}%`);

if (failed > 0) {
  console.log('\n⚠️  Some accessibility checks failed. Consider improving these areas.');
  process.exit(1);
} else {
  console.log('\n🎉 All accessibility checks passed!');
  process.exit(0);
}