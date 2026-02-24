# Contributing to Glanus Agent

Thank you for considering contributing to Glanus Agent! This document outlines the process for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/your-org/glanus-agent/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, version, etc.)
   - Relevant logs

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternatives considered
   - Additional context

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow Rust style guidelines
   - Add tests for new features
   - Update documentation
   - Run tests: `cargo test`
   - Run clippy: `cargo clippy`
   - Format code: `cargo fmt`

4. **Commit your changes**
   ```bash
   git commit -m "feat: add feature description"
   ```
   
   Commit message format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test changes
   - `chore:` Build/tooling changes

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Describe your changes
   - Reference related issues
   - Ensure CI passes

## Development Setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.sh | sh

# Clone repository
git clone https://github.com/your-org/glanus-agent
cd glanus-agent

# Install dependencies
cd src-tauri
cargo build

# Run tests
cargo test

# Run development build
cargo tauri dev
```

## Code Style

- Follow Rust naming conventions
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small
- Write tests for new features

## Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

## Building Installers

See [installers/](./installers/) directory for platform-specific instructions.

## Questions?

Open an issue or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
