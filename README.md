# FedEvaluation

FedEva is a reference implementation for federated evaluation workflows. It combines a React interface with lightweight Python services for group fairness (`Fed-e³`), performance fairness (`Fed4Fed`), and collaborative fairness (`D³EM`), and includes sample inputs for direct reproduction.

## Repository Contents

- React frontend for interactive evaluation, visualization, and bilingual (`EN` / `中文`) presentation
- Python backend for `Fed-e³` and `Fed4Fed` on port `8000`
- Python backend for `D³EM` on port `8010`
- Example input files under `examples/`
- Backend tests and sample-generation scripts

## Quick Start

1. Install frontend dependencies:

```bash
npm install
```

2. Start the full local stack:

```bash
npm run dev
```

This starts:

- the fairness backend at `http://127.0.0.1:8000`
- the D3EM backend at `http://127.0.0.1:8010`
- the frontend at `http://127.0.0.1:3000`

If you prefer separate processes:

```bash
npm run dev:backend:fairness
npm run dev:backend:d3em
npm run dev:frontend
```

To stop occupied local ports:

```bash
npm run dev:stop
```

On macOS / Linux you can also use:

```bash
./start.sh
./stop.sh
```

## Example Workflow

1. Open the homepage and choose `Fed-e³`, `Fed4Fed`, or `D³EM`.
2. Click `Load sample data`, or upload the example files in `examples/`.
3. Run the evaluation and inspect the plots, summaries, and fairness conclusions.
4. Use the `EN` / `中文` switch in the navigation bar if needed.

## Example Files

Group fairness:

- `examples/fede3/Client1/bootstrap_metrics.txt`
- `examples/fede3/Client2/bootstrap_metrics.txt`
- `examples/fede3/Client3/bootstrap_metrics.txt`

Performance fairness:

- `examples/fed4fed/Client1/bootstrap_metrics.txt`
- `examples/fed4fed/Client2/bootstrap_metrics.txt`
- `examples/fed4fed/Client3/bootstrap_metrics.txt`

Collaborative fairness:

- `examples/d3em/Client1/contribution_series.txt`
- `examples/d3em/Client1/independent_accuracy.txt`
- `examples/d3em/Client1/rewarded_accuracy.txt`
- `examples/d3em/Client2/contribution_series.txt`
- `examples/d3em/Client2/independent_accuracy.txt`
- `examples/d3em/Client2/rewarded_accuracy.txt`
- `examples/d3em/Client3/contribution_series.txt`
- `examples/d3em/Client3/independent_accuracy.txt`
- `examples/d3em/Client3/rewarded_accuracy.txt`

## API Services

Fairness backend on port `8000`:

- `POST /fed4fed/evaluate`
- `POST /fede3/evaluate`

D3EM backend on port `8010`:

- `POST /api/d3em/evaluate`

The frontend defaults are defined in `.env.example`:

```bash
HOST=127.0.0.1
PORT=3000
BROWSER=none
REACT_APP_API_BASE=http://127.0.0.1:8000
REACT_APP_D3EM_API_BASE=http://127.0.0.1:8010
```

## Validation

Backend tests:

```bash
npm run test:backend
npm run test:d3em
```

Frontend production build:

```bash
npm run build
```

## Project Structure

```text
.
├── d3em/
├── examples/
├── fed4fed/
├── public/
├── scripts/
├── src/
├── .env.example
├── package.json
├── start.sh
├── stop.sh
└── README.md
```
