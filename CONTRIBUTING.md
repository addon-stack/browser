<!--
  CONTRIBUTING.md
  Guidelines for contributing to the @adnbn/browser project.
-->

# Contributing to @adnbn/browser

> **Project Vision:** Our goal is to deliver a comprehensive TypeScript-based promise wrapper for the entire Chrome Extensions API surface (Manifest V2 & V3). Contributions to extend coverage and refine existing implementations are highly valued.
>
> _Thank you for taking the time to contribute to this project!_

This document outlines the process for contributing, reporting issues, and submitting patches. By participating, you agree to abide by the project’s [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

1. [Reporting Bugs](#reporting-bugs)
2. [Suggesting Enhancements](#suggesting-enhancements)
3. [Development Setup](#development-setup)
4. [Submitting a Pull Request](#submitting-a-pull-request)
5. [Code Style](#code-style)
6. [Commit Messages](#commit-messages)
7. [Code of Conduct](#code-of-conduct)
8. [License](#license)

---

## Reporting Bugs

To file a clear and actionable bug report:

1. Search existing issues to see if the bug has already been reported.
2. If not, open a new issue and include:
    - A descriptive title.
    - Steps to reproduce the problem.
    - Expected vs. actual behavior.
    - Environment details (OS, browser, Node.js/npm versions).
    - Any relevant stack traces or screenshots.

## Suggesting Enhancements

For feature requests or enhancements:

1. Check open issues for similar proposals.
2. Open a new issue with:
    - A clear use case or motivation.
    - Proposed API or code examples (if available).
    - Any alternatives you considered.

## Development Setup

1. Fork the repository:  
   `git clone git@github.com:addonbone/browser.git`
2. Install dependencies:
    ```bash
    cd browser
    npm install
    ```
3. Available scripts:
    - `npm run format` — format code with Prettier
    - `npm run build` — build the project with tsup

## Submitting a Pull Request

1. Create a feature branch:  
   `git checkout -b feature/name`
2. Make your changes in TypeScript under `src/`.
3. Ensure formatting passes:
    ```bash
    npm run format
    ```
4. Run the build to confirm no errors:
    ```bash
    npm run build
    ```
5. Commit changes using [Conventional Commits](https://www.conventionalcommits.org/):
    ```
    feat(core): add new API method for X
    ```
6. Push to your fork and open a Pull Request against the `main` branch.
7. Provide a clear title and description, referencing related issues (e.g., `Closes #123`).

## Code Style

- Language: **TypeScript**
- Formatting: **Prettier**

Please run `npm run format` before submitting code.

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>
```

Common types:

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation only changes
- `style`: formatting, missing semicolons, etc
- `refactor`: code change that neither fixes a bug nor adds a feature
- `test`: adding missing tests or correcting existing tests
- `chore`: updating build tasks, package manager configs, etc

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## License

By contributing, you agree that your changes will be licensed under the project’s MIT License.
