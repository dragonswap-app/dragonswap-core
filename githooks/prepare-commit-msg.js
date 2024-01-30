const fs = require("fs");

const commitFilePath = process.argv[2];

console.log("test 4")

const CommitTypeEnum = {
	remove: ":fire:",
	fix: ":bug:",
	feature: ":sparkles:",
	refactor: ":recycle:",
	config: ":wrench:",
	packages: ":package:",
	assets: ":bento:",
	architecture: ":building_construction:",
	merge: ":twisted_rightwards_arrows:"
};

(async () => {
	const fileContent = await fs.promises.readFile(commitFilePath);
	const commitType = fileContent.toString().split(":")[0];
	let newCommitMessage = fileContent.toString();
	if (CommitTypeEnum[commitType]) {
		newCommitMessage = `${
			CommitTypeEnum[commitType]
		} ${fileContent.toString()}`;
	}
	await fs.promises.writeFile(commitFilePath, newCommitMessage);
})();
