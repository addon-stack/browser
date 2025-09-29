const pkg = require("./package.json");

const types = [
    {type: "feat", section: "✨ Features", hidden: false},
    {type: "fix", section: "🐛 Bug Fixed", hidden: false},
    {type: "perf", section: "⚡️ Performance Improvements", hidden: false},
    {type: "refactor", section: "🛠️ Refactoring", hidden: false},
    {type: "docs", section: "📝 Documentation", hidden: true},
    {type: "test", section: "Tests", hidden: true},
    {type: "build", section: "🏗️ Build System", hidden: true},
    {type: "ci", section: "🤖 CI", hidden: false},
    {type: "chore", section: "🧹 Chores", hidden: true},
    {type: "revert", section: "⏪ Reverts", hidden: false},
];

const typesMap = new Map(types.map(t => [t.type, t]));
const repoUrl = pkg && pkg.repository && pkg.repository.url ? pkg.repository.url.replace(/\.git$/, "") : null;

/** @type {import('release-it').Config} */
module.exports = {
    plugins: {
        "@release-it/conventional-changelog": {
            preset: "conventionalcommits",
            infile: "CHANGELOG.md",
            context: {
                name: pkg.name,
                pkg: {name: pkg.name},
                repoUrl,
            },
            presetConfig: {
                types,
            },
            recommendedBumpOpts: {
                whatBump(commits) {
                    const patchTypes = new Set(["fix", "perf", "refactor", "ci"]);
                    const isBreaking = c => Array.isArray(c.notes) && c.notes.length > 0;

                    // Major
                    if (commits.some(isBreaking)) {
                        return {level: 0, reason: "BREAKING CHANGE"};
                    }

                    // Minor
                    if (commits.some(c => (c.type || "").toLowerCase() === "revert")) {
                        return {level: 1, reason: "revert commits (policy → minor)"};
                    }

                    if (commits.some(c => (c.type || "").toLowerCase() === "feat")) {
                        return {level: 1, reason: "feat commits"};
                    }

                    // Patch
                    if (commits.some(c => patchTypes.has((c.type || "").toLowerCase()))) {
                        return {level: 2, reason: "patch-level types (fix/perf/refactor/chore/ci/build)"};
                    }

                    return null;
                },
            },
            writerOpts: {
                headerPartial:
                    "## 🚀 Release {{#if name}}`{{name}}` {{else}}{{#if @root.pkg}}`{{@root.pkg.name}}` {{/if}}{{/if}}v{{version}} ({{date}})\n\n",
                mainTemplate:
                    "{{> header}}\n" +
                    "{{#each commitGroups}}\n### {{title}}\n\n{{#each commits}}{{> commit root=@root}}\n{{/each}}\n\n{{/each}}" +
                    "{{#unless commitGroups}}\n{{#each commits}}{{> commit root=@root}}\n{{/each}}{{/unless}}",
                commitPartial:
                    "{{#if type}}* {{#if scope}}**{{scope}}:** {{/if}}{{#if subject}}{{subject}}{{else}}{{header}}{{/if}}{{#if href}} ([{{shorthash}}]({{href}})){{/if}}\n\n{{#if body}}{{{body}}}\n{{/if}}{{/if}}",
                groupBy: "type",
                commitGroupsSort: "title",
                commitsSort: ["scope", "subject"],
                transform: commit => {
                    const nextCommit = {...commit};

                    const type = (nextCommit.type || "").toLowerCase();
                    const value = typesMap.get(type);

                    if (value && value.hidden) {
                        return false;
                    }

                    if (value) {
                        nextCommit.type = value.section;
                    }

                    if (nextCommit.body) {
                        const body = nextCommit.body.replace(/\r\n/g, "\n").trim();

                        nextCommit.body = body
                            .split("\n")
                            .map(line => (line ? "  " + line : ""))
                            .join("\n");
                    }

                    if (!nextCommit.href && nextCommit.hash && repoUrl) {
                        nextCommit.href = `${repoUrl}/commit/${nextCommit.hash}`;
                    }

                    if (!nextCommit.shorthash && nextCommit.hash) {
                        nextCommit.shorthash = nextCommit.hash.slice(0, 7);
                    }

                    return nextCommit;
                },
            },
        },
    },
    git: {
        requireCleanWorkingDir: true,
        requireUpstream: false,
        requireBranch: false,
        commit: true,
        commitMessage: "chore(release): v${version} [skip ci]",
        tag: true,
        tagName: "v${version}",
        tagAnnotation: "v${version}",
        push: true,
    },
    npm: {
        publish: true,
        versionArgs: ["--no-git-tag-version"],
        publishArgs: ["--provenance"],
    },
    github: {
        release: true,
        releaseName: "v${version}",
    },
    ci: true,
};
