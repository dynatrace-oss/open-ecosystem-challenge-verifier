const core = require('@actions/core');
const {loadFile, trackVerificationCompleted} = require('../../helpers');

const verifyAdventure2Expert = async () => {
  core.info('\u001b[38;5;6m\u001b[1m🌆 Adventure 02 | 🔴 Expert (The Guardian Protocls)'); // bold cyan

  const {success, failedChecks} = verify();

  // Track verification result
  await trackVerificationCompleted(
    '02-building-cloudhaven',
    'expert',
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

  // Load expert workflow files
  const applyWorkflow = loadFile('.github/workflows/adventure02-expert-apply-infrastructure.yaml', 'adventure02-expert-apply-infrastructure.yaml');
  const driftWorkflow = loadFile('.github/workflows/adventure02-expert-detect-drift.yaml', 'adventure02-expert-detect-drift.yaml');
  const validateWorkflow = loadFile('.github/workflows/adventure02-expert-validate-changes.yaml', 'adventure02-expert-validate-changes.yaml');

  // Check files loaded successfully
  if (!applyWorkflow || !driftWorkflow || !validateWorkflow) {
    failedChecks.push('files_not_found');
    return {success: false, failedChecks};
  }

  // ====================
  // Verifying objectives
  // ====================
  core.info('🎯 Verifying objectives...');
  core.info('  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/02-building-cloudhaven/expert/#objective');

  // ====================
  // Objective 1: Detect infrastructure drift
  // ====================
  core.info('  - 🔬 Objective 1: Detect infrastructure drift');

  // Normalize the drift workflow for comparison
  const normalizedDriftWorkflow = driftWorkflow.replace(/\s+/g, '');

  // Check if tofu plan is used with -detailed-exitcode flag
  const usesDetailedExitCode = normalizedDriftWorkflow.includes('-detailed-exitcode');

  // Check that drift output is set to true when changes are detected
  const setsDriftTrue = normalizedDriftWorkflow.includes('drift=true');

  if (!usesDetailedExitCode) {
    core.setFailed('❌ Drift detection is not implemented correctly');
    core.info('    💡 Hint: Check the OpenTofu documentation for `tofu plan` - there is a flag that helps detect changes in CI/CD pipelines.');
    success = false;
    failedChecks.push('drift_detection_missing_detailed_exitcode');
  } else if (!setsDriftTrue) {
    core.setFailed('❌ Drift detection does not set the drift output correctly');
    core.info('    💡 Hint: When drift is detected, make sure to set the step output so subsequent steps know about it.');
    success = false;
    failedChecks.push('drift_output_not_set');
  } else {
    core.info('    ✅ Drift detection is properly implemented');
  }

  // ====================
  // Objective 2: Validate pull requests
  // ====================
  core.info('  - 🔬 Objective 2: Validate pull requests');

  // Normalize the validate workflow for comparison
  const normalizedValidateWorkflow = validateWorkflow.replace(/\s+/g, '');

  // 2a: Check that the GCP API mock service has port mapping configured
  // The service container needs ports exposed to be reachable by tofu test
  // The tests expect the mock API to be available on port 9000
  const hasPortMapping = normalizedValidateWorkflow.includes('gcp-api-mock:') &&
    normalizedValidateWorkflow.includes('9000:8080');

  if (!hasPortMapping) {
    core.setFailed('❌ GCP API mock service is not properly configured');
    core.info('    💡 Hint: Service containers need their ports exposed to be reachable from workflow steps.');
    success = false;
    failedChecks.push('gcp_api_mock_port_mapping_missing');
  } else {
    core.info('    ✅ GCP API mock service is properly configured');
  }

  // 2b: Check that Trivy security scanning is properly configured
  // The Trivy action needs configuration to scan and output results that can be parsed
  const hasTrivyAction = normalizedValidateWorkflow.includes('aquasecurity/trivy-action');
  const hasExitCodeZero = /exit-code:['"]?0['"]?/.test(normalizedValidateWorkflow);
  const hasScanRef = /scan-ref:/.test(normalizedValidateWorkflow);
  const hasSeverity = /severity:/.test(normalizedValidateWorkflow);
  const hasJsonFormat = /format:['"]?json['"]?/.test(normalizedValidateWorkflow);
  const hasJsonOutput = /output:['"]?[^'"]*\.json['"]?/.test(normalizedValidateWorkflow);

  if (!hasTrivyAction || !hasExitCodeZero || !hasScanRef || !hasSeverity || !hasJsonFormat || !hasJsonOutput) {
    core.setFailed('❌ Security scanning is not properly configured');
    core.info('    💡 Hint: The Trivy action needs a configuration block (with:) to specify scan parameters, output format, and exit behavior.');
    success = false;
    failedChecks.push('trivy_config_missing');
  } else {
    core.info('    ✅ Security scanning is properly configured');
  }

  // 2c: Check that the workflow fails on critical or high severity vulnerabilities
  // Should check the count outputs and exit with non-zero code
  const checksVulnerabilityCounts = normalizedValidateWorkflow.includes('steps.count.outputs.critical') &&
    normalizedValidateWorkflow.includes('steps.count.outputs.high');

  const exitsOnFailure = /exit['"]?1/.test(normalizedValidateWorkflow);

  if (!checksVulnerabilityCounts || !exitsOnFailure) {
    core.setFailed('❌ Workflow does not fail on blocking vulnerabilities');
    core.info('    💡 Hint: The workflow should check the vulnerability counts and exit with a failure code when critical OR high severity vulnerabilities are found.');
    success = false;
    failedChecks.push('fail_on_vulnerabilities_missing');
  } else {
    core.info('    ✅ Workflow fails on blocking vulnerabilities');
  }

  // ====================
  // Objective 3: Apply infrastructure automatically
  // ====================
  core.info('  - 🔬 Objective 3: Apply infrastructure automatically');

  // Normalize the apply workflow for comparison
  const normalizedApplyWorkflow = applyWorkflow.replace(/\s+/g, '');

  // Check that the apply workflow uses command: apply (not plan)
  const usesApplyCommand = /command:['"]?apply['"]?/.test(normalizedApplyWorkflow);

  if (!usesApplyCommand) {
    core.setFailed('❌ Apply workflow does not apply infrastructure changes');
    core.info('    💡 Hint: The apply workflow should use the correct command to apply infrastructure changes, not just plan them.');
    success = false;
    failedChecks.push('apply_command_missing');
  } else {
    core.info('    ✅ Apply workflow is properly configured');
  }

  return {success, failedChecks};
}

module.exports = {verifyAdventure2Expert};

