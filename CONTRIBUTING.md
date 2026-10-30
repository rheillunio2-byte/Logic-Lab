# 🤝 Contributing to LogicLab

Thank you for your interest in contributing to **LogicLab**! Contributions, bug fixes, suggestions, documentation updates, and feature improvements are welcome.

LogicLab is an interactive digital logic simulator built with React, JavaScript, and Vite. This guide explains how to contribute while keeping the project organized, reliable, and easy to maintain.

---

## How to Contribute

### 1. Fork the Repository

Open the LogicLab repository on GitHub and click **Fork** to create your own copy.

### 2. Clone Your Fork

Replace `your-username` with your GitHub username.

```bash
git clone https://github.com/your-username/LogicLab.git
cd LogicLab
```

### 3. Create a Branch

Create a separate branch for your changes.

For new features:

```bash
git checkout -b feature/your-feature-name
```

For bug fixes:

```bash
git checkout -b fix/your-bug-name
```

For documentation updates:

```bash
git checkout -b docs/your-documentation-update
```

### 4. Set Up the Development Environment

Make sure Node.js and npm are installed on your computer.

Install the project dependencies:

```bash
npm install
```

For Windows PowerShell users who encounter an execution-policy error involving `npm.ps1`, use:

```powershell
npm.cmd install
```

Start the development server:

```bash
npm run dev
```

Or, in Windows PowerShell:

```powershell
npm.cmd run dev
```

Open the local URL provided by Vite in your browser.

### 5. Make Your Changes

You may contribute by:

- Fixing bugs in Boolean logic evaluation.
- Improving circuit simulation.
- Adding additional logic gates.
- Improving component connections and configurations.
- Enhancing truth-table generation.
- Improving CSV export functionality.
- Improving D flip-flop simulation.
- Enhancing the Circuit Builder interface.
- Improving the Truth Table page.
- Expanding the Learning Guide.
- Improving responsive design and accessibility.
- Adding educational explanations and examples.
- Writing tests for logic functions.
- Improving project documentation.
- Optimizing application performance.

Keep your changes focused and consistent with the existing project structure.

### 6. Test Your Changes

Before submitting your work, make sure your changes function correctly.

Build the application:

```bash
npm run build
```

For Windows PowerShell:

```powershell
npm.cmd run build
```

You should also run the development server:

```bash
npm run dev
```

Manually check the affected features.

Make sure that:

- The application starts successfully.
- The sidebar navigation displays the correct pages.
- Circuit components can be added and removed.
- Input signals can be toggled.
- Component connections work correctly.
- Logic gate outputs are evaluated correctly.
- Truth tables display the correct combinations.
- CSV exports contain the expected data.
- D flip-flops capture their inputs when a clock pulse is applied.
- Existing functionality has not been unintentionally broken.

The current project does not include a dedicated automated testing command. If you introduce a testing framework, document its setup and commands.

### 7. Commit Your Changes

Use a clear commit message that describes your modifications.

```bash
git add .
git commit -m "Improve circuit evaluation"
```

Other examples:

```bash
git commit -m "Add NAND gate support"
git commit -m "Fix truth table generation"
git commit -m "Improve learning guide layout"
git commit -m "Update project documentation"
```

### 8. Push Your Branch

```bash
git push origin feature/your-feature-name
```

Replace the branch name with the one you created.

### 9. Submit a Pull Request

Open your fork on GitHub and create a Pull Request against the original LogicLab repository.

Include:

- A clear summary of your changes.
- The reason for the change.
- Relevant testing results.
- Screenshots for interface modifications, if applicable.
- Any known limitations or issues.

---

## Development Guidelines

To keep LogicLab maintainable and reliable, please follow these practices:

- Write clean and readable JavaScript and JSX code.
- Use meaningful variable, function, and component names.
- Keep functions and components focused on specific responsibilities.
- Follow the existing project structure.
- Avoid unnecessary dependencies.
- Handle errors gracefully and provide useful feedback.
- Keep Boolean logic evaluation in `src/logic.js` where practical.
- Keep interface-related changes organized within the React components and stylesheet.
- Add tests for new functionality when practical.
- Update documentation when features or setup instructions change.
- Avoid modifying unrelated parts of the project.

---

## Logic and Simulation Guidelines

LogicLab is intended to demonstrate digital logic behavior accurately within its documented scope.

When modifying or adding simulation functionality:

- Represent binary signals consistently using `0` and `1`.
- Ensure that logic gate behavior follows its correct Boolean operation.
- Maintain consistent handling of unconnected inputs.
- Preserve circuit cycle detection.
- Ensure truth tables cover all possible input combinations within the supported input limit.
- Distinguish combinational logic from sequential logic.
- Do not treat stateful components as ordinary combinational gates.
- Document any simplifications made by the simulator.
- Test normal operations, edge cases, and invalid connections.

For sequential components, distinguish stored states from combinational outputs. Avoid suggesting that the simplified simulation represents real electrical timing behavior.

---

## Interface Guidelines

When improving the user interface:

- Maintain consistency with the existing LogicLab design.
- Keep navigation labels clear and understandable.
- Ensure that buttons and interactive controls have meaningful functions.
- Provide useful feedback when operations succeed or fail.
- Maintain responsive layouts for different screen sizes.
- Consider accessibility and keyboard navigation.
- Include screenshots in your Pull Request when significant visual changes are introduced.

---

## Reporting Bugs

If you discover a bug, open a GitHub Issue and include:

- A clear description of the problem.
- Steps to reproduce the issue.
- Expected behavior.
- Actual behavior.
- Relevant error messages or browser-console output.
- Node.js and npm versions.
- Operating system and browser.
- The affected feature or component.

Remove private information from screenshots and logs before sharing them.

---

## Suggesting Features

Feature suggestions are welcome.

When proposing an improvement, explain:

- What the feature should do.
- What problem it solves.
- How it would benefit users.
- Any implementation ideas or examples.

Possible areas for future development include:

- NAND, NOR, and XNOR gates.
- Drag-and-drop circuit construction.
- Circuit saving and loading.
- Timing diagrams and waveform visualization.
- Additional flip-flop types.
- Multi-bit logic components.
- Interactive quizzes and guided lessons.
- Improved export functionality.
- Automated testing.
- Additional educational resources.

These are suggestions for future development, not a guarantee that they are already implemented.

---

## Dependencies and Project Configuration

LogicLab currently uses:

- React for the user interface.
- Vite for development and production builds.
- Lucide React for icons.
- JavaScript for application functionality.

Contributors should:

- Avoid unnecessary dependencies.
- Update `package.json` when dependencies change.
- Keep dependency versions consistent.
- Do not commit the `node_modules/` directory.
- Do not commit generated production files unless specifically required.
- Verify that the production build works after configuration changes.

---

## Security Guidelines

LogicLab does not currently require API keys or external AI credentials for its implemented features.

Contributors should still follow responsible development practices:

- Never commit passwords, API keys, tokens, or confidential information.
- Avoid collecting or transmitting unnecessary user data.
- Validate user-controlled input.
- Handle malformed circuit configurations safely.
- Do not execute arbitrary user-provided code as part of circuit evaluation.
- Review third-party dependencies before introducing them.
- Keep project dependencies updated.

Report potentially serious security vulnerabilities privately to the project maintainer instead of publishing sensitive exploit details in a public issue.

---

## Pull Request Checklist

Before submitting a Pull Request, confirm the following:

- [ ] The application starts successfully.
- [ ] The production build completes successfully.
- [ ] The changes work as intended.
- [ ] Existing functionality has not been unintentionally broken.
- [ ] Circuit evaluation has been checked when relevant.
- [ ] Truth-table results have been verified when relevant.
- [ ] Documentation has been updated when necessary.
- [ ] No unnecessary dependencies or generated folders are included.
- [ ] Screenshots are provided for significant interface changes.
- [ ] Commit messages clearly describe the modifications.
- [ ] No confidential information or credentials are included.

---

## License

No license has been specified for LogicLab yet. Please check the repository's `LICENSE` file before reusing or redistributing project code.

Contributions will be subject to the license selected for LogicLab once one is added.

---

Thank you for helping improve **LogicLab** and making digital logic easier to explore, understand, and learn!

**LogicLab — Learn, Build, and Explore Digital Logic.**