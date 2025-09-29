const pkg = require("./package.json");
const {execSync} = require("node:child_process");

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
const repoUrl = pkg?.repository?.url ? pkg.repository.url.replace(/\.git$/, "") : null;

function sh(cmd) {
    try {
        return execSync(cmd, {encoding: "utf8"}).trim();
    } catch {
        return "";
    }
}

const latestTag = sh("git tag --list 'v*' --sort=-v:refname | head -n 1") || null;

function getCommits() {
    const range = latestTag ? `${latestTag}..HEAD` : "HEAD";
    const raw = sh(`git log ${range} --pretty=format:%H%n%s%n%b%n----END----`);

    if (!raw) {
        return [];
    }

    const blocks = raw
        .split("----END----\n")
        .map(b => b.trim())
        .filter(Boolean);

    const commits = [];

    for (const block of blocks) {
        const [hashLine, ...rest] = block.split("\n");

        if (!hashLine) {
            continue;
        }

        const hash = hashLine.trim();
        const header = (rest[0] || "").trim();
        const body = rest.slice(1).join("\n");
        const notes = /(^|\n)BREAKING CHANGE(?::|\b)/.test(body) ? [{title: "BREAKING CHANGE", text: body}] : [];
        const m = header.match(/^([a-zA-Z]+)(\([^)]+\))?!?:\s*(.*)$/);
        const type = m ? m[1].toLowerCase() : "";

        commits.push({hash, header, body, type, notes});
    }

    return commits;
}

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
                previousTag: latestTag || undefined,
            },
            presetConfig: {
                types,
            },
            gitRawCommitsOpts: latestTag ? {from: latestTag} : {},
            recommendedBumpOpts: {
                whatBump() {
                    const commits = getCommits(latestTag);

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
                        return {level: 2, reason: "patch-level types (fix/perf/refactor/ci)"};
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

                    if (value?.hidden) {
                        return false;
                    }

                    if (value) {
                        nextCommit.type = value.section;
                    }

                    if (nextCommit.body) {
                        const body = nextCommit.body.replace(/\r\n/g, "\n").trim();
                        nextCommit.body = body
                            .split("\n")
                            .map(line => (line ? `  ${line}` : ""))
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
        // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
        commitMessage: "chore(release): v${version} [skip ci]",
        tag: true,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
        tagName: "v${version}",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
        tagAnnotation: "v${version}",
        push: true,
        tagMatch: "v*",
    },
    npm: {
        publish: true,
        versionArgs: ["--no-git-tag-version"],
        publishArgs: ["--provenance", "--access", "public"],
    },
    github: {
        release: true,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
        releaseName: "v${version}",
    },
    ci: true,
};
