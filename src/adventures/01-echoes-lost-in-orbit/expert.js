const core = require('@actions/core');
const yaml = require('js-yaml');
const fs = require('fs');

const verifyAdventure1Expert = () => {
  core.info('\u001b[38;5;6m\u001b[1m🚀 Adventure 01 | 🔴 Expert (Hyperspace Operations & Transport)'); // bold cyan

  const success = verify();
  if (success) {
    core.notice('\u001b[38;5;6m✅ 🎉 Congratulations! You have successfully completed the challenge! 🎉'); // cyan
  } else {
    core.setFailed('\u001b[38;5;6m❌ Challenge verification failed. Please review all errors and try again.'); // cyan
  }
}

const verify = () => {
  let success = true;
  const rollout = loadFile('adventures/01-echoes-lost-in-orbit/expert/manifests/hotrod/rollout.yaml', 'Rollout')
  const analysisTemplate = loadFile('adventures/01-echoes-lost-in-orbit/expert/manifests/hotrod/analysis-template.yaml', 'AnalysisTemplate')
  const otelConfigRaw = loadFile('adventures/01-echoes-lost-in-orbit/expert/manifests/otel/config.yaml', 'OpenTelemetry Collector Config');

  // Check if files loaded successfully
  if (!rollout || !analysisTemplate || !otelConfigRaw) {
    return false;
  }

  const otelConfig = yaml.load(otelConfigRaw?.data['collector-config.yaml']);

  // ====================
  // Verifying objectives
  // ====================
  core.info('🎯 Verifying objectives...');
  core.info(`  Details: https://dynatrace-oss.github.io/open-ecosystem-challenges/01-echoes-lost-in-orbit/expert/#objective`);

  core.info('  - Automated rollout progression to HotROD version `1.76.0` driven by observability signals');
  const image = rollout?.spec?.template?.spec?.containers?.[0]?.image;
  if (!image) {
    core.setFailed('❌ Unable to find pod info image in Rollout manifest');
    success = false;
  } else if (image !== 'jaegertracing/example-hotrod:1.76.0') {
    core.setFailed(`❌ Image and/or tag is incorrect. Found: ${image}. Expected: jaegertracing/example-hotrod:1.76.0`);
    success = false;
  } else {
    core.info('    ✅ Correct image and tag found (jaegertracing/example-hotrod:1.76.0)');
  }

  core.info('  - OpenTelemetry Collector configured with OTLP receiver for traces from HotROD, spanmetrics connector converting traces as metrics and trace export to Jaeger & metrics export to Prometheus')
  const httpReceiver = otelConfig?.receivers?.otlp?.protocols?.http;
  if (!httpReceiver) {
    core.setFailed(`❌ Unable to find HTTP OTLP receiver in OpenTelemetry Collector configuration`);
    success = false;
  } else {
    core.info('    ✅ OpenTelemetry receivers are correctly configured');
  }
  const prometheusExporter = otelConfig?.exporters?.prometheus;
  if (!prometheusExporter) {
    core.setFailed(`❌ Unable to find Prometheus exporter in OpenTelemetry Collector configuration`);
    success = false;
  } else {
    if (prometheusExporter.endpoint === '0.0.0.0:8889' || prometheusExporter.endpoint === 'localhost:8889' || prometheusExporter.endpoint === ':8889') {
      core.info('    ✅ Prometheus exporter is correctly configured');
    } else {
      core.setFailed(`❌ Prometheus exporter is incorrectly configured`);
      success = false;
    }
  }
  const metricsPipeline = otelConfig?.service?.pipelines?.metrics;
  if (!metricsPipeline) {
    core.setFailed(`❌ Unable to find metrics pipeline in OpenTelemetry Collector configuration`);
    success = false;
  } else {
    if (metricsPipeline.receivers?.includes('spanmetrics') && metricsPipeline.exporters?.includes('prometheus')) {
      core.info('    ✅ Metrics pipeline is correctly configured');
    } else {
      core.setFailed(`❌ Metrics pipeline is incorrectly configured`);
      success = false;
    }
  }

  core.info('  - Canary analysis validating deployments with 3 queries: Traffic detection ensuring minimum request rate (**>= 0.05 req/s**) to the canary to prevent "idle canaries" that get promoted but never had real traffic. You can use the `hotrod_requests_total` metric to verify this | Error rate thresholds (< 5%) | Latency thresholds for the 95th percentile (< 1000ms)')
  const queries = analysisTemplate.spec?.metrics;
  if (!queries || queries.length !== 3) {
    core.setFailed(`❌ Expected exactly 3 queries in AnalysisTemplate, found ${queries ? queries.length : 0}`);
    success = false;
  } else {
    // Find the traffic detection query by excluding known query names (error-rate and latency queries)
    const idleCanaryQuery = queries?.find(m => !m.name.includes('error-rate') && !m.name.includes('latency'));
    if (!idleCanaryQuery) {
      core.setFailed(`❌ Unable to find traffic detection query in AnalysisTemplate`);
      success = false;
    } else {
      const prometheusProvider = idleCanaryQuery.provider?.prometheus;
      if (!prometheusProvider) {
        core.setFailed(`❌ traffic detection metric does not use Prometheus as data provider`);
        success = false;
        core.setFailed(`❌ Unable to find traffic detection query in AnalysisTemplate`);
        core.setFailed(`❌ The analysis template can't read Prometheus metrics in all queries`);
        success = false;
      } else if (!idleCanaryQuery.successCondition || !idleCanaryQuery.successCondition.includes('>=') || !idleCanaryQuery.successCondition.includes('0.05')) {
        core.setFailed(`❌ The traffic detection query must ensure at least 0.05 requests per second to the canary (found: ${idleCanaryQuery.successCondition || 'undefined'})`);
        success = false;
      } else {
        const normalizedQuery = prometheusProvider.query.replace(/\s+/g, '');
        if (!normalizedQuery.includes('sum(rate(')) {
          core.setFailed(`❌ The traffic detection query must calculate requests per second`);
          success = false;
        } else if (!normalizedQuery.includes('hotrod_requests_total') && !normalizedQuery.includes('hotrod_http_requests_total')) {
          core.setFailed(`❌ The traffic detection query must use the hotrod_requests_total metric`);
          success = false;
        } else if (!normalizedQuery.includes('namespace="{{args.namespace}}"') || !normalizedQuery.includes('rollouts_pod_template_hash="{{args.canary-hash}}"')) {
          core.setFailed(`❌ The traffic detection query must filter by namespace and pod template hash`);
          success = false;
        } else {
          core.info('    ✅ traffic detection metric is correctly configured');
        }
      }
    }
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

module.exports = {verifyAdventure1Expert};
