# Contributing to Laika Music

Thank you for your interest in contributing to Laika Music! We welcome contributions from everyone.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Help?

- **Reporting Bugs**: If you find a bug, please open an issue using the Bug Report template.
- **Suggesting Features**: We're always looking for new ideas! Use the Feature Request template to suggest enhancements.
- **Code Contributions**: Pull requests are welcome! Please ensure your code follows our style guidelines and includes necessary tests.
- **Documentation**: Improving documentation is a great way to help.

## Development Workflow

1.  **Fork the repository**.
2.  **Create a branch** for your changes: `git checkout -b feature/your-feature-name` or `bugfix/your-bug-name`.
3.  **Implement your changes**.
4.  **Test your changes** thoroughly.
5.  **Commit your changes** with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add search functionality`
    - `fix: resolve playback stuttering`
    - `docs: update contributing guide`
6.  **Push your branch**: `git push origin feature/your-feature-name`.
7.  **Open a Pull Request** against the `main` branch.

## Pull Request Guidelines

- Provide a clear and concise description of the changes.
- Reference any related issues (e.g., `Closes #123`).
- Ensure the CI/CD pipeline passes.
- Be responsive to feedback during the review process.

## Style Guidelines

### Backend (Python)
- Follow [PEP 8](https://pep8.org/).
- Use type hints wherever possible.
- Use `black` for formatting and `ruff` for linting.

### Mobile/Web (TypeScript/React)
- Use functional components and hooks.
- Follow the established project structure.
- Use `eslint` and `prettier` for linting and formatting.

## License

By contributing, you agree that your contributions will be licensed under the project's [GPL-3.0 License](LICENSE).
