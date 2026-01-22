const core = require('@actions/core');
const {loadFile, trackVerificationCompleted} = require('../../helpers');

const verifyAdventure2Intermediate = async () => {
  core.info('\u001b[38;5;6m\u001b[1m🌆 Adventure 02 | 🟡 Intermediate (The Modular Metropolis)'); // bold cyan

  const {success, failedChecks} = verify();

  // Track verification result
  await trackVerificationCompleted(
    '02-building-cloudhaven',
    'intermediate',
    success ? 'success' : 'failed',
    failedChecks
  );

  if (success) {
    core.notice('\u001b[38;5;6m✅ 🎉 Congratulations! You have successfully completed the challenge! 🎉'); // cyan
  } else {
    core.setFailed('\u001b[38;5;6m❌ Challenge verification failed. Please review all errors and try again.'); // cyan
  }
}

const verify = () => {
  let success = true;
  const failedChecks = [];
  const moduleLedgerTf = loadFile('adventures/02-building-cloudhaven/intermediate/modules/district/ledger.tf', 'modules/district/ledger.tf');
  const moduleMainTf = loadFile('adventures/02-building-cloudhaven/intermediate/modules/district/main.tf', 'modules/district/main.tf');
  const moduleVariables = loadFile('adventures/02-building-cloudhaven/intermediate/modules/district/variables.tf', 'modules/district/variables.tf');
  const integrationTest = loadFile('adventures/02-building-cloudhaven/intermediate/tests/integration.tftest.hcl', 'tests/integration.tftest.hcl');


  // Check if files loaded successfully
  if (!moduleLedgerTf || !moduleMainTf || !moduleVariables || !integrationTest) {
    failedChecks.push('files_not_found');
    return {success: false, failedChecks};
  }

  // ====================
  // Verifying objectives
  // ====================
  core.info('🎯 Verifying objectives...');
  core.info(`  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/02-building-cloudhaven/intermediate/#objective`);

  core.info('  - 🔬 Objective 1: All tests of the districts module pass');

  // Check if user_labels uses merge with local.common_labels
  // Remove all whitespace for comparison to handle different formatting
  const normalizedLedger = moduleLedgerTf.replace(/\s+/g, '');
  const usesMergeWithCommonLabels = normalizedLedger.includes('user_labels=merge(local.common_labels,');

  if (!usesMergeWithCommonLabels) {
    core.setFailed('❌ tests/ledger.tftest.hcl is failing');
    core.info('    💡 Hint: The ledger should reuse the common labels defined in the module,');
    core.info('       not hardcode them. Look for a way to combine the common labels with');
    core.info('       ledger-specific ones.');
    success = false;
    failedChecks.push('user_labels_not_using_merge_common_labels');
  } else {
    core.info('    ✅ tests/ledger.tftest.hcl succeeds');
  }

  // Check if location_map includes us-central1 = "US"
  // Remove all whitespace for comparison to handle different formatting
  const normalizedMain = moduleMainTf.replace(/\s+/g, '');
  const hasUsCentral1 = normalizedMain.includes('"us-central1"="US"');

  if (!hasUsCentral1) {
    core.setFailed('❌ tests/vault.tftest.hcl is failing');
    core.info('    💡 Hint: Make sure all regions used in CloudHaven are supported in the location map.');
    success = false;
    failedChecks.push('location_map_missing_us_central1');
  } else {
    core.info('    ✅ tests/vault.tftest.hcl succeeds');
  }

  // Check if validation condition uses can(regex(...))
  // Remove all whitespace for comparison to handle different formatting
  const normalizedVariables = moduleVariables.replace(/\s+/g, '');
  const usesCanRegex = normalizedVariables.includes('can(regex(');

  if (!usesCanRegex) {
    core.setFailed('❌ tests/variables.tftest.hcl is failing');
    core.info('    💡 Hint: Variable validation should use a regex pattern to check the input format.');
    success = false;
    failedChecks.push('validation_not_using_regex');
  } else {
    core.info('    ✅ tests/variables.tftest.hcl succeeds');
  }

  // ====================
  // Objective 2: Integration test
  // ====================
  core.info('  - 🔬 Objective 2: A completed integration test that applies infrastructure against the mock GCP API');

  // Remove all whitespace for comparison to handle different formatting
  const normalizedIntegration = integrationTest.replace(/\s+/g, '');

  // Check if command = apply is present
  const hasApplyCommand = normalizedIntegration.includes('command=apply');

  // Check for vault name conditions (support both module.* and output.districts["*"] patterns)
  const hasNorthMarketVault = normalizedIntegration.includes('module.north_market.vault.name=="cloudhaven-north-market-vault"') ||
    normalizedIntegration.includes('output.districts["north-market"].vault.name=="cloudhaven-north-market-vault"');
  const hasSouthBazaarVault = normalizedIntegration.includes('module.south_bazaar.vault.name=="cloudhaven-south-bazaar-vault"') ||
    normalizedIntegration.includes('output.districts["south-bazaar"].vault.name=="cloudhaven-south-bazaar-vault"');
  const hasScholarsDistrictVault = normalizedIntegration.includes('module.scholars_district.vault.name=="cloudhaven-scholars-district-vault"') ||
    normalizedIntegration.includes('output.districts["scholars-district"].vault.name=="cloudhaven-scholars-district-vault"');

  // Check for disk size conditions (support both module.* and output.districts["*"] patterns)
  const hasNorthMarketDiskSize = normalizedIntegration.includes('module.north_market.ledger.disk_size==20') ||
    normalizedIntegration.includes('output.districts["north-market"].ledger.disk_size==20');
  const hasSouthBazaarDiskSize = normalizedIntegration.includes('module.south_bazaar.ledger.disk_size==10') ||
    normalizedIntegration.includes('output.districts["south-bazaar"].ledger.disk_size==10');
  const hasScholarsDistrictDiskSize = normalizedIntegration.includes('module.scholars_district.ledger.disk_size==50') ||
    normalizedIntegration.includes('output.districts["scholars-district"].ledger.disk_size==50');

  const allConditionsMet = hasApplyCommand &&
    hasNorthMarketVault && hasSouthBazaarVault && hasScholarsDistrictVault &&
    hasNorthMarketDiskSize && hasSouthBazaarDiskSize && hasScholarsDistrictDiskSize;

  if (!allConditionsMet) {
    core.setFailed('❌ tests/integration.tftest.hcl is failing');
    core.info('    💡 Hint: Your integration test should verify the following for each district:');
    core.info('       - Vault names follow the pattern: cloudhaven-{district-name}-vault');
    core.info('       - Ledger disk sizes match the tier configuration');
    if (!hasApplyCommand) {
      core.info('    ⚠️  Missing: The test should actually apply the infrastructure, not just plan it');
    }
    if (!hasNorthMarketVault || !hasSouthBazaarVault || !hasScholarsDistrictVault) {
      core.info('    ⚠️  Missing: Vault name assertions for one or more districts');
    }
    if (!hasNorthMarketDiskSize || !hasSouthBazaarDiskSize || !hasScholarsDistrictDiskSize) {
      core.info('    ⚠️  Missing: Disk size assertions for one or more districts');
    }
    success = false;
    failedChecks.push('integration_test_incomplete');
  } else {
    core.info('    ✅ tests/integration.tftest.hcl succeeds');
  }

  // ====================
  // Objective 3: Three districts deployed
  // ====================
  core.info('  - 🔬 Objective 3: Three districts deployed with correctly configured infrastructure (vaults and ledgers)');
  if (success) {
    core.info('    ✅ Infrastructure can be applied successfully if all other objectives are met');
  } else {
    core.setFailed('❌ Infrastructure apply may fail due to previous errors');
  }

  return {success, failedChecks};
}

module.exports = {verifyAdventure2Intermediate};

