import { applicationLimit, phaserLimit, verifyBuildBudget } from './build-manifest.mjs';

const { applicationBytes, phaserBytes } = await verifyBuildBudget();
console.log(`Build budgets passed: initial JavaScript ${applicationBytes}/${applicationLimit} bytes; lazy Phaser ${phaserBytes}/${phaserLimit} bytes.`);
