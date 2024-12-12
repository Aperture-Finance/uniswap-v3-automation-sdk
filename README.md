# Uniswap V3 Automation SDK

This repository contains the Uniswap V3 Automation SDK developed by Aperture Finance.

[![Lint](https://github.com/Aperture-Finance/uniswap-v3-automation-sdk/actions/workflows/lint.yml/badge.svg)](https://github.com/Aperture-Finance/uniswap-v3-automation-sdk/actions/workflows/lint.yml)
[![Test](https://github.com/Aperture-Finance/uniswap-v3-automation-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/Aperture-Finance/uniswap-v3-automation-sdk/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@aperture_finance/uniswap-v3-automation-sdk/latest.svg)](https://www.npmjs.com/package/@aperture_finance/uniswap-v3-automation-sdk/v/latest)

## Overview

The Uniswap V3 Automation SDK is a comprehensive software development kit designed to automate various workflows related to Uniswap V3. It provides a set of tools, libraries, and utilities that simplify the process of interacting with the Uniswap V3 protocol.

## Features

- **Automate Liquidity Provision**: The SDK enables you to automate the process of providing liquidity to Uniswap V3 pools. It offers functionalities for calculating optimal positions, managing liquidity ranges, and handling position updates.

- **Trade Execution Automation**: With the SDK, you can automate the execution of trades on Uniswap V3. It provides tools for generating trade paths, estimating gas costs, and executing trades with customizable parameters.

- **Position Management**: The SDK simplifies the management of your Uniswap V3 positions. It includes features for tracking position details, monitoring performance metrics, and adjusting positions based on market conditions.

- **Analytics and Reporting**: Utilize the SDK's analytics and reporting capabilities to gain insights into your Uniswap V3 activities. It offers tools for generating reports, visualizing data, and analyzing historical performance.

## Documentation

For detailed information on how to use the Uniswap V3 Automation SDK, please refer to the official documentation: [Documentation Link](https://github.com/Aperture-Finance/uniswap-v3-automation-sdk).

## Getting Started

To get started with the Uniswap V3 Automation SDK, follow these steps:

1. Clone the repository:

```
git clone https://github.com/Aperture-Finance/uniswap-v3-automation-sdk.git
```

2. Install the required dependencies:

```
npm i -g yarn
yarn
```

3. Explore the examples and code samples provided in the repository to understand the SDK's functionalities and usage patterns.

# Use `yarn link` for debugging

When debugging with frontend / backend environment, you don't have to release a new version for every change. Instead, use `yarn link` can easily replace current module under `node_modules` with your local code.

Here's the step:

1. Build this sdk repo

```
❯ yarn && yarn build
```

2. Run `yarn link` in this sdk repo root

```
❯ yarn link
yarn link v1.22.22
success Registered "@aperture_finance/uniswap-v3-automation-sdk".
info You can now run `yarn link "@aperture_finance/uniswap-v3-automation-sdk"` in the projects where you want to use this package and it will be used instead.
```

3. Run `yarn link @aperture_finance/uniswap-v3-automation-sdk` in target project, it will create a soft link to sdk code.

```
❯ yarn link @aperture_finance/uniswap-v3-automation-sdk
yarn link v1.22.22
success Using linked package for "@aperture_finance/uniswap-v3-automation-sdk".
```

4. (Optional) If making changes on this sdk repo, you will need to re-build this sdk repo

```
❯ yarn && yarn build
```

5. Use unlink followed by `yarn install --force` in the target project to clean up the soft link

```
❯ yarn unlink @aperture_finance/uniswap-v3-automation-sdk
yarn unlink v1.22.22
success Removed linked package "@aperture_finance/uniswap-v3-automation-sdk".
❯ yarn install --force
```

6. (Optional) Run `yarn unlink` in this sdk repo to unlink

```
❯ yarn unlink @aperture_finance/uniswap-v3-automation-sdk
success Unregistered "@aperture_finance/uniswap-v3-automation-sdk".
```

## Version Naming Conventions

- **V2**: Custom Solver
- **V3**: Migrate from feeBips to feeAmount

## Contributing

We welcome contributions from the community!

## Licensing

The license for Aperture Automation SDK is the Business Source License 1.1 (BUSL-1.1), see [LICENSE](./LICENSE).

## Contact

If you have any questions, suggestions, or feedback, please feel free to reach out to us at engineering@aperture.finance
