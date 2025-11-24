const core = require('@actions/core');
const {verifyAdventure1Beginner} = require("./adventures/01-echoes-lost-in-orbit/beginner");

const challenge = core.getInput('challenge');

if (challenge === '01-echoes-lost-in-orbit_beginner') {
  verifyAdventure1Beginner();
} else {
  core.setFailed("❌ Invalid challenge specified.");
}
