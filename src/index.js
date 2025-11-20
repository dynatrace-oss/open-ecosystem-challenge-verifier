const core = require('@actions/core');
const {verifyAdventure1Easy} = require("./adventures/01-echoes-lost-in-orbit/easy");

const challenge = core.getInput('challenge');

if (challenge === '01-echoes-lost-in-orbit_easy') {
  verifyAdventure1Easy();
} else {
  core.setFailed("❌ Invalid challenge specified.");
}
