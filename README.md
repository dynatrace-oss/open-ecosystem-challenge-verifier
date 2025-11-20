# Open Ecosystem Challenge Verifier

A GitHub Action for verifying [Open Ecosystem Challenge](https://dynatrace-oss.github.io/open-ecosystem-challenges/)
solutions. This action runs automated checks against challenge submissions to ensure participants have successfully
completed the required objectives.

## Overview

The Open Ecosystem Challenges are hands-on mini challenges focused on cloud native technologies, observability, AI/ML,
and open source topics. Each challenge has two verification mechanisms:

1. **Local Smoke Tests**: Run in the participant's Codespace to check basic success criteria
2. **Full Verification Workflow**: Runs via this GitHub Action when solutions are pushed to the main branch, performing
   comprehensive validation without revealing solutions

This repository provides the verification workflow component.

## Usage

### Basic Example

Add this action to your workflow file (e.g., `.github/workflows/verify.yml`):

```yaml
name: Verify Challenge Solution

on:
  push:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Verify challenge
        uses: dynatrace-oss/open-ecosystem-challenge-verifier@main
        with:
          challenge: '01-echoes-lost-in-orbit_easy'
```

### Inputs

| Input       | Description                                                                                   | Required |
|-------------|-----------------------------------------------------------------------------------------------|----------|
| `challenge` | The name of the challenge to verify. Must match the challenge folder name in this repository. | Yes      |

## How It Works

1. The action receives a challenge identifier as input
2. It loads the corresponding verification script from `src/challenges/<challenge-name>.js`
3. The verification script checks the solution against predefined success criteria.
4. Returns success or failure with detailed feedback

## Development

### Adding a New Challenge

1. Add a new file `src/adventures/<challenge-name>/<difficulty>.js` with your verification logic
2. Export a verification function
3. Update `src/index.js` to handle the new challenge identifier
4. Follow the existing pattern for feedback messages
5. Bundle everything by running `npm run build`

### Tips for Good Tests

- Stick to defined objectives in output - makes it easier for users without giving away additional hints
- Validate YAML/JSON format before checking content
- Check specifications against official documentation
- Provide links to relevant challenge objectives
- Use colored output for better readability (info, notice, error, setFailed)
