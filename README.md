# FedEva

FedEva is an interactive interface for federated evaluation workflows. The system integrates group fairness, performance fairness, and collaborative fairness analysis, and supports direct execution with sample inputs.

## Features

- `Fed-e³`, `Fed4Fed`, and `D³EM` workflow pages
- Local file upload and structured client input
- Built-in sample data for quick reproduction
- English / Chinese interface toggle
- Visualization of intermediate statistics and evaluation results

## Quick Start

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Usage

The interface supports two main workflows:

1. Click `Load sample data` on a module page to run a built-in example.
2. Upload the sample text files in `examples/` as client-side inputs.

Use the `EN` / `中文` switch in the top navigation bar to change the interface language.

## Example Files

- `examples/fede3/Client1/bootstrap_metrics.txt`
- `examples/fede3/Client2/bootstrap_metrics.txt`
- `examples/fede3/Client3/bootstrap_metrics.txt`
- `examples/fed4fed/Client1/bootstrap_metrics.txt`
- `examples/fed4fed/Client2/bootstrap_metrics.txt`
- `examples/fed4fed/Client3/bootstrap_metrics.txt`
- `examples/d3em/Client1/contribution_series.txt`
- `examples/d3em/Client1/independent_accuracy.txt`
- `examples/d3em/Client1/rewarded_accuracy.txt`

Additional client example files are available in the corresponding subdirectories.

## Project Structure

```text
.
├── public/
├── src/
├── examples/
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```
