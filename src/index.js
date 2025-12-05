const core = require('@actions/core');
const {verifyAdventure1Beginner} = require("./adventures/01-echoes-lost-in-orbit/beginner");
const {verifyAdventure1Intermediate} = require("./adventures/01-echoes-lost-in-orbit/intermediate");

const challenge = core.getInput('challenge');

if (challenge === '01-echoes-lost-in-orbit_beginner') {
  verifyAdventure1Beginner();
} else if (challenge === '01-echoes-lost-in-orbit_intermediate') {
  verifyAdventure1Intermediate();
} else {
  core.setFailed("❌ Invalid challenge specified.");
}
