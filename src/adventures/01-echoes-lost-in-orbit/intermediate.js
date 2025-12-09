const core = require('@actions/core');
const yaml = require('js-yaml');
const fs = require('fs');

const verifyAdventure1Intermediate = () => {
  core.info('\u001b[38;5;6m\u001b[1m🚀 Adventure 01 | 🟡 Intermediate (The Silent Canary)'); // bold cyan

  const success = verify();
  if (success) {
    core.notice('\u001b[38;5;6m✅ 🎉 Congratulations! You have successfully completed the challenge! 🎉'); // cyan
  } else {
    core.setFailed('\u001b[38;5;6m❌ Challenge verification failed. Please review all errors and try again.'); // cyan
  }
}

const verify = () => {
  let success = true;
  const rollout = loadFile('adventures/01-echoes-lost-in-orbit/intermediate/manifests/base/rollout.yaml', 'Rollout')
  const analysisTemplate = loadFile('adventures/01-echoes-lost-in-orbit/intermediate/manifests/base/analysis-template.yaml', 'AnalysisTemplate')

  // ====================
  // Verifying objectives
  // ====================
  core.info('🎯 Verifying objectives...');
  core.info(`  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/01-echoes-lost-in-orbit/intermediate/#objective`);

  core.info('  - Pod info version 6.9.3 deployed successfully in both staging and production environments');
  const image = rollout?.spec?.template?.spec?.containers?.[0]?.image;
  if (!image) {
    core.setFailed('❌ Unable to find pod info image in Rollout manifest');
    success = false;
  } else if (image !== 'stefanprodan/podinfo:6.9.3') {
    core.setFailed(`❌ Image and/or tag is incorrect. Found: ${image}. Expected: stefanprodan/podinfo:6.9.3`);
    success = false;
  } else {
    core.info('    ✅ Correct image and tag found (stefanprodan/podinfo:6.9.3)');
  }

  core.info('  - Two working PromQL queries in the `AnalysisTemplate` that validate application health during releases')
  const queries = analysisTemplate.spec?.metrics;
  const restartQuery = queries?.find(m => m.name === 'container-restarts');

  if (!restartQuery) {
    core.setFailed(`❌ Unable to find 'container-restarts' metric query in AnalysisTemplate`);
    success = false;
  } else {
    const prometheusProvider = restartQuery.provider?.prometheus;
    if (!prometheusProvider) {
      core.setFailed(`❌ 'container-restarts' metric does not use Prometheus as data provider`);
      success = false;
    } else if (prometheusProvider.address !== `http://prometheus-server.prometheus.svc.cluster.local`) {
      core.setFailed(`❌ The analysis template can't read Prometheus metrics in all queries`);
      success = false;
    } else if (!restartQuery.successCondition || !checksForZero(restartQuery.successCondition)) {
      core.setFailed(`❌ The analysis template does not check for zero container restarts during rollout`);
      success = false;
    } else if (!prometheusProvider.query || !prometheusProvider.query.replace(/\s+/g, '').includes('sum(increase(kube_pod_container_status_restarts_total{namespace="{{args.namespace}}",pod=~"echo-server-.*"}[1m]))orvector(0)')) {
      core.setFailed(`❌ The PromQL query to check for container restarts has been changed`);
    } else {
      core.info('    ✅ `container-restarts` metric query is correctly configured');
    }
  }

  const readyContainersQuery = queries?.find(m => m.name === 'ready-containers');
  if (!readyContainersQuery) {
    core.setFailed(`❌ Unable to find 'ready-containers' metric query in AnalysisTemplate`);
    success = false;
  } else {
    const prometheusProvider = readyContainersQuery.provider?.prometheus;
    if (!prometheusProvider) {
      core.setFailed(`❌ 'ready-containers' metric does not use Prometheus as data provider`);
      success = false;
    } else if (prometheusProvider.address !== `http://prometheus-server.prometheus.svc.cluster.local`) {
      core.setFailed(`❌ The analysis template can't read Prometheus metrics in all queries`);
      success = false;
    } else if (!readyContainersQuery.successCondition || !checksForAtLeastOne(readyContainersQuery.successCondition)) {
      core.setFailed(`❌ The analysis template does not check for at least one ready container during rollout`);
      success = false;
    } else if (!prometheusProvider.query || !isValidReadyContainersQuery(prometheusProvider.query)) {
      core.setFailed(`❌ The PromQL query to check for ready containers is incorrect or missing. It should check how many containers of echo-server pods are ready in the correct namespace.`);
      success = false;
    } else {
      core.info('    ✅ `ready-containers` metric query is correctly configured');
    }
  }

  core.info('  - Rollouts automatically progress through canary stages based on health metrics')
  core.info('  - All rollouts complete successfully')
  if (success) {
    core.info('    ✅ Rollouts should be automatically progressing and completing successfully if all other objectives are met');
  } else {
    core.setFailed('❌ Rollouts may not be progressing automatically due to previous errors');
  }

  return success;
}

const loadFile = (path, name) => {
  let parsed;

  // =======================
  // Validating YAML format
  // =======================
  core.info(`📋 Validating ${name} YAML format...`);
  if (!fs.existsSync(path)) {
    core.setFailed(`❌ ${name} manifest not found at: ${path}`);
    return false;
  }

  let content;
  try {
    content = fs.readFileSync(path, 'utf8');
  } catch (error) {
    core.setFailed(`❌ Failed to read ${name} file: ${error.message}`);
    return false;
  }

  try {
    parsed = yaml.load(content);
  } catch (error) {
    core.setFailed(`❌ Failed to parse YAML: ${error.message}`);
    return false;
  }

  if (!parsed) {
    core.setFailed(`❌ ${name} YAML is empty or invalid`);
    return false;
  }

  core.info(`  ✅ ${name} YAML is valid`);
  return parsed;
}

const checksForZero = (condition) => {
  if (!condition) return false;

  const normalized = condition.replace(/\s+/g, ''); // Remove all whitespace

  const validPatterns = [
    'result[0]==0',         // == 0
    'result[0]<1',          // < 1
    'result[0]<=0',         // <= 0
    '0==result[0]',         // 0 == result[0]
    '1>result[0]',          // 1 > result[0]
    '0>=result[0]',         // 0 >= result[0]
  ];

  return validPatterns.includes(normalized);
};

const checksForAtLeastOne = (condition) => {
  if (!condition) return false;

  const normalized = condition.replace(/\s+/g, ''); // Remove all whitespace

  const validPatterns = [
    'result[0]>=1',         // >= 1
    'result[0]>0',          // > 0
    '1<=result[0]',         // 1 <= result[0]
    '0<result[0]',          // 0 < result[0]
  ];

  return validPatterns.includes(normalized);
};

const isValidReadyContainersQuery = (query) => {
  if (!query) return false;

  // Normalize the query by removing all whitespace for easier checking
  const normalized = query.replace(/\s+/g, '');

  // Must contain the core metric
  if (!normalized.includes('kube_pod_container_status_ready')) {
    return false;
  }

  // Must have namespace filter with the args placeholder
  if (!normalized.includes('namespace="{{args.namespace}}"')) {
    return false;
  }

  // Must have pod filter with the echo-server pattern
  if (!normalized.includes('pod=~"echo-server-.*"')) {
    return false;
  }

  return normalized.startsWith('sum(') || normalized.startsWith('count(');
};

module.exports = { verifyAdventure1Intermediate };
