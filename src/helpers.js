const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');

const TRACKER_URL = "https://grzxx1q7wd.execute-api.us-east-1.amazonaws.com/default/codespace-tracker";
const EVENT_TYPE = "open-ecosystem-challenges";

const loadFile = (path, name) => {
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

    return content;
}

/**
 * Send a verification completed event to Dynatrace
 * @param {string} adventure - The adventure identifier (e.g., "02-building-cloudhaven")
 * @param {string} level - The level (e.g., "beginner")
 * @param {string} status - "success" or "failed"
 * @param {string[]} failedChecks - Array of failed check identifiers
 */
const trackVerificationCompleted = async (adventure, level, status, failedChecks = []) => {
    const githubUser = process.env.GITHUB_REPOSITORY_OWNER || 'unknown';
    const githubRepo = process.env.GITHUB_REPOSITORY || 'unknown';
    const codespaceId = core.getInput('codespace_id') || 'unknown';
    const workflowRunId = process.env.GITHUB_RUN_ID || '';

    const payload = {
        type: EVENT_TYPE,
        action: "verification.completed",
        adventure: adventure,
        level: level,
        "github.user": githubUser,
        "github.repo": githubRepo,
        "codespace.id": codespaceId,
        status: status,
        failed_checks: failedChecks,
        "workflow.run_id": workflowRunId
    };

    try {
        const response = await fetch(TRACKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            core.debug(`Tracking request failed with status: ${response.status}`);
        }
    } catch (error) {
        // Silent fail - don't break verification if tracking fails
        core.debug(`Failed to send tracking event: ${error.message}`);
    }
}

module.exports = {loadFile, trackVerificationCompleted};
