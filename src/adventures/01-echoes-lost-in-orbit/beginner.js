const core = require('@actions/core');
const yaml = require('js-yaml');
const fs = require('fs');

const verifyAdventure1Beginner = () => {
  core.info('\u001b[38;5;6m\u001b[1m🚀 Adventure 01 | 🟢 Beginner (Broken Echoes)'); // bold cyan

  const success = verify();
  if (success) {
    core.notice('\u001b[38;5;6m✅ 🎉 Congratulations! You have successfully completed the challenge! 🎉'); // cyan
  } else {
    core.setFailed('\u001b[38;5;6m❌ Challenge verification failed. Please review all errors and try again.'); // cyan
  }
}

const verify = () => {
  let success = true;
  const appSetPath = 'adventures/01-echoes-lost-in-orbit/beginner/manifests/appset.yaml';
  let appSet;

  // =====================================
  // Validating ApplicationSet YAML format
  // =====================================
  core.info('📋 Validating ApplicationSet YAML format...');
  if (!fs.existsSync(appSetPath)) {
    core.setFailed(`❌ ApplicationSet manifest not found at: ${appSetPath}`);
    return false;
  }

  let appSetContent;
  try {
    appSetContent = fs.readFileSync(appSetPath, 'utf8');
  } catch (error) {
    core.setFailed(`❌ Failed to read ApplicationSet file: ${error.message}`);
    return false;
  }

  try {
    appSet = yaml.load(appSetContent);
  } catch (error) {
    core.setFailed(`❌ Failed to parse YAML: ${error.message}`);
    return false;
  }

  if (!appSet) {
    core.setFailed('❌ ApplicationSet YAML is empty or invalid');
    return false;
  }

  core.info('  ✅ ApplicationSet YAML is valid');

  // =======================================
  // Validating ApplicationSet specification
  // =======================================
  core.info('🔍 Validating ApplicationSet specification...');

  const isValidSpec =
    appSet.apiVersion === 'argoproj.io/v1alpha1' &&
    appSet.kind === 'ApplicationSet' &&
    appSet.metadata?.name &&
    appSet.metadata?.namespace === 'argocd' &&
    appSet.spec?.generators?.length > 0 &&
    appSet.spec?.template?.metadata?.name &&
    appSet.spec?.template?.spec?.source &&
    appSet.spec?.template?.spec?.destination;

  if (!isValidSpec) {
    core.setFailed(`❌ ApplicationSet specification is invalid or incomplete. Please ensure your ApplicationSet follows the ArgoCD specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/`)
  }

  core.info('  ✅ ApplicationSet specification is valid');

  // ==========================================
  // Verifying objectives
  // ==========================================
  core.info('🎯 Verifying objectives...');
  core.info(`  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/01-echoes-lost-in-orbit/beginner/#objective`);

  core.info('  - See two distinct Applications in the Argo CD dashboard (one per environment)');
  const appName = appSet.spec.template.metadata.name;
  if (!appName.includes('{{path.basename}}') && !appName.includes('{{ path.basename }}')) {
    core.setFailed(`❌ Application names will not be distinct. Found: ${appName}`);
    success = false;
  } else {
    core.info('    ✅ Application names are configured to be distinct');
  }

  core.info('  - Ensure each Application deploys to its own isolated namespace');
  const namespace = appSet.spec.template.spec.destination.namespace;
  if (!namespace) {
    core.setFailed(`❌ Application namespace is not configured`);
    success = false;
  } else if (!namespace.includes('{{path.basename}}') && !namespace.includes('{{ path.basename }}')) {
    core.setFailed(`❌ Applications will not deploy to isolated namespaces. Found: ${namespace}`);
    success = false;
  } else {
    core.info('    ✅ Each Application is configured to deploy to its own isolated namespace');
  }

  core.info('  - Make the system resilient so changes from outside Git cannot break it');
  const syncPolicy = appSet.spec.template.spec.syncPolicy;
  if (!syncPolicy || !syncPolicy.automated || !syncPolicy.automated.selfHeal) {
    core.setFailed('❌ System is not resilient to manual changes');
    success = false;
  } else {
    core.info('    ✅ System is resilient to changes from outside Git');
  }

  core.info('  - Confirm that updates happen automatically without leaving stale resources behind');
  if (!syncPolicy || !syncPolicy.automated) {
    core.setFailed('❌ Automated updates are not configured');
    success = false;
  } else if (!syncPolicy.automated.prune) {
    core.setFailed('❌ Stale resources will not be removed automatically');
    success = false;
  } else {
    core.info('    ✅ Updates are configured to happen automatically without leaving stale resources behind');
  }

  return success;
}

module.exports = {verifyAdventure1Beginner};

