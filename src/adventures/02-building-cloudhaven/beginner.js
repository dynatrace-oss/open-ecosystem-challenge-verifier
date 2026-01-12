const core = require('@actions/core');
const {loadFile, trackVerificationCompleted} = require('../../helpers');

const verifyAdventure2Beginner = async () => {
  core.info('\u001b[38;5;6m\u001b[1m🌆 Adventure 02 | 🟢 Beginner (The Foundation Stones)'); // bold cyan

  const {success, failedChecks} = verify();

  // Track verification result
  await trackVerificationCompleted(
    '02-building-cloudhaven',
    'beginner',
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
  const auditTf = loadFile('adventures/02-building-cloudhaven/beginner/audit.tf', 'audit.tf');
  const mainTf = loadFile('adventures/02-building-cloudhaven/beginner/main.tf', 'main.tf');
  const merchantsTf = loadFile('adventures/02-building-cloudhaven/beginner/merchants.tf', 'merchants.tf');
  const stateTf = loadFile('adventures/02-building-cloudhaven/beginner/state.tf', 'state.tf');

  // Check if files loaded successfully
  if (!auditTf || !mainTf || !merchantsTf || !stateTf) {
    failedChecks.push('files_not_found');
    return {success: false, failedChecks};
  }

  // ====================
  // Verifying objectives
  // ====================
  core.info('🎯 Verifying objectives...');
  core.info(`  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/02-building-cloudhaven/beginner/#objective`);

  core.info('  - Provision storage vaults and ledger databases for each district dynamically');
  const vaultForEachRegex = /resource\s*"google_storage_bucket"\s*"vault"\s*\{[^}]*for_each\s*=\s*var\.districts/s;
  const ledgerForEachRegex = /resource\s*"google_sql_database_instance"\s*"ledger"\s*\{[^}]*for_each\s*=\s*var\.districts/s;

  const hasVaultForEach = vaultForEachRegex.test(merchantsTf);
  const hasLedgerForEach = ledgerForEachRegex.test(merchantsTf);

  if (!hasVaultForEach) {
    core.setFailed('❌ Storage vaults are not provisioned dynamically for each district');
    failedChecks.push('storage_vaults_not_dynamic');
    success = false;
  } else {
    core.info('    ✅ Storage vaults are provisioned dynamically for each district');
  }

  if (!hasLedgerForEach) {
    core.setFailed('❌ Ledger databases are not provisioned dynamically for each district');
    failedChecks.push('ledger_databases_not_dynamic');
    success = false;
  } else {
    core.info('    ✅ Ledger databases are provisioned dynamically for each district');
  }

  core.info('  - Deploy the audit database only when there is more than one district');
  // Check if the audit database uses enabled with length(var.districts) > 1 condition
  // Valid patterns:
  // - enabled = length(var.districts) > 1
  // - enabled = length(var.districts) >= 2
  const auditDbRegex = /resource\s*"google_sql_database_instance"\s*"merchant_audit"\s*\{/s;
  const hasAuditDb = auditDbRegex.test(auditTf);

  if (!hasAuditDb) {
    core.setFailed('❌ Audit database resource not found');
    failedChecks.push('audit_database_not_found');
    success = false;
  } else {
    // Check for enabled with length > 1
    const enabledGreaterThanRegex = /enabled\s*=\s*length\s*\(\s*var\.districts\s*\)\s*>\s*1/s;
    // Check for enabled with length >= 2
    const enabledGreaterOrEqualRegex = /enabled\s*=\s*length\s*\(\s*var\.districts\s*\)\s*>=\s*2/s;

    const hasGreaterThan = enabledGreaterThanRegex.test(auditTf);
    const hasGreaterOrEqual = enabledGreaterOrEqualRegex.test(auditTf);

    if (!hasGreaterThan && !hasGreaterOrEqual) {
      core.setFailed('❌ Audit database is not conditionally deployed based on the number of districts');
      failedChecks.push('audit_database_not_conditional');
      success = false;
    } else {
      core.info('    ✅ Audit database is conditionally deployed based on the number of districts');
    }
  }

  core.info('  - Store state remotely in a GCS backend following best practices so the Guild can collaborate');
  // Check for GCS backend configuration in main.tf
  const gcsBackendRegex = /backend\s*"gcs"\s*\{[^}]*bucket\s*=\s*"cloudhaven-tfstate"/s;
  const hasGcsBackend = gcsBackendRegex.test(mainTf);

  if (!hasGcsBackend) {
    core.setFailed('❌ Remote state is not configured with GCS backend');
    failedChecks.push('gcs_backend_not_configured');
    success = false;
  } else {
    core.info('    ✅ Remote state is configured with GCS backend');
  }

  // Check for versioning enabled in state.tf
  const versioningRegex = /versioning\s*\{[^}]*enabled\s*=\s*true/s;
  const hasVersioning = versioningRegex.test(stateTf);

  if (!hasVersioning) {
    core.setFailed('❌ State bucket does not have versioning enabled');
    failedChecks.push('state_bucket_versioning_not_enabled');
    success = false;
  } else {
    core.info('    ✅ State bucket has versioning enabled');
  }

  core.info('  - Resolve all TODOs in the code and successfully run tofu apply');
  if (success) {
    core.info('    ✅ tofu apply should complete successfully if all other objectives are met');
  } else {
    core.setFailed('❌ tofu apply may fail due to previous errors');
  }

  return {success, failedChecks};
}

module.exports = {verifyAdventure2Beginner};

