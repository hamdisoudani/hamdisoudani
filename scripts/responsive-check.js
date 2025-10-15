#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📱 Running Responsive Design Checks...\n');

const cssPath = path.join(__dirname, '..', 'assets', 'custom.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Responsive design checks
const checks = [
  {
    name: 'Mobile Breakpoint',
    test: () => cssContent.includes('@media (max-width: 768px)'),
    description: 'Includes mobile breakpoint at 768px'
  },
  {
    name: 'Small Mobile Breakpoint',
    test: () => cssContent.includes('@media (max-width: 480px)'),
    description: 'Includes small mobile breakpoint at 480px'
  },
  {
    name: 'Flexible Layout',
    test: () => cssContent.includes('flex-wrap') || cssContent.includes('grid-template-columns'),
    description: 'Uses flexible layout techniques (flex/grid)'
  },
  {
    name: 'Relative Units',
    test: () => {
      const relativeUnits = cssContent.match(/\b(rem|em|%|vw|vh)\b/g) || [];
      return relativeUnits.length > 10; // Should use many relative units
    },
    description: 'Uses relative units for responsive sizing'
  },
  {
    name: 'Flexible Typography',
    test: () => {
      const fontSizeChanges = cssContent.match(/font-size:[^;]*rem/g) || [];
      return fontSizeChanges.length >= 3;
    },
    description: 'Typography scales responsively'
  },
  {
    name: 'Container Queries',
    test: () => cssContent.includes('container-type') || cssContent.includes('@container'),
    description: 'Uses container queries for component-level responsiveness'
  },
  {
    name: 'Touch-Friendly Sizing',
    test: () => {
      const minTouchSize = cssContent.match(/min-(width|height):[^;]*4[0-9]px/g) || [];
      return minTouchSize.length > 0;
    },
    description: 'Interactive elements have touch-friendly minimum sizes'
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

console.log('📊 Responsive Design Check Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Score: ${Math.round((passed / checks.length) * 100)}%`);

// Additional analysis
console.log('\n🔍 Additional Responsive Features Found:');

if (cssContent.includes('flex-direction: column')) {
  console.log('✅ Mobile stacking with flex-direction: column');
}

if (cssContent.includes('width: 100%')) {
  console.log('✅ Full-width elements for mobile');
}

if (cssContent.includes('max-width')) {
  console.log('✅ Content constraints with max-width');
}

if (failed > 0) {
  console.log('\n⚠️  Some responsive design checks failed. Consider improving mobile experience.');
  process.exit(1);
} else {
  console.log('\n🎉 All responsive design checks passed!');
  process.exit(0);
}