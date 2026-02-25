# Mock Data

This directory contains mock data for development and testing.

## Structure

```
mocks/
├── data/           # CSV files exported from SQL Server
│   ├── departments.csv
│   ├── machines.csv
│   ├── employees.csv
│   ├── work_orders.csv
│   ├── work_order_details.csv
│   ├── warehouses.csv
│   ├── dictionary.csv
│   ├── employee_functions.csv
│   └── teams.csv
├── handlers/       # MSW request handlers
└── index.ts        # Mock data loaders and utilities
```

## Usage

1. Export CSV files from SQL Server using queries in docs/
2. Place CSV files in `data/` directory
3. Run the data loader to generate TypeScript mock data

## Note

CSV files are gitignored by default to avoid committing production data.
Add sanitized sample data if needed for CI/CD.
