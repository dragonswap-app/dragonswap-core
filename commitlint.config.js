module.exports = {
	extends: ["gitmoji"],
	helpUrl: "https://gitmoji.dev/",
	rules: {
		"header-max-length": [2, "always", 124],
		"scope-empty": [2, "always"],
		"subject-empty": [2, "never"],
		"type-empty": [2, "never"],
		"subject-case": [2, "always", "sentence-case"],
		"type-case": [2, "always", "camel-case"],
		"type-enum": [
			2,
			"always",
			[
				"remove",
				"fix",
				"feat",
				"refactor",
				"config",
				"packages",
				"chore",
				"merge",
				"ci"
			],
		],
	},
};
