/** @type {import("@commitlint/types").UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Scopes are optional, but when present keep them to this vocabulary so the
		// changelog stays readable.
		"scope-enum": [
			1,
			"always",
			["db", "auth", "server", "ui", "ci", "deps", "docs", "test", "config", "release"],
		],
		"subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
		"body-max-line-length": [0],
	},
};
