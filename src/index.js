const core = require('@actions/core');
const {verifyAdventure1Beginner} = require("./adventures/01-echoes-lost-in-orbit/beginner");
const {verifyAdventure1Intermediate} = require("./adventures/01-echoes-lost-in-orbit/intermediate");
const {verifyAdventure1Expert} = require("./adventures/01-echoes-lost-in-orbit/expert");
const {verifyAdventure2Beginner} = require("./adventures/02-building-cloudhaven/beginner");
const {verifyAdventure2Intermediate} = require("./adventures/02-building-cloudhaven/intermediate");

const challenge = core.getInput('challenge');

(async () => {
    if (challenge === '01-echoes-lost-in-orbit_beginner') {
        verifyAdventure1Beginner();
    } else if (challenge === '01-echoes-lost-in-orbit_intermediate') {
        verifyAdventure1Intermediate();
    } else if (challenge === '01-echoes-lost-in-orbit_expert') {
        verifyAdventure1Expert();
    } else if (challenge === '02-building-cloudhaven_beginner') {
        await verifyAdventure2Beginner();
    } else if (challenge === '02-building-cloudhaven_intermediate') {
        await verifyAdventure2Intermediate();
    } else {
        core.setFailed("❌ Invalid challenge specified.");
    }
})().catch(err => {
    core.setFailed(`❌ Unexpected error: ${err.message}`);
});
