## Tornado cash Proposal #8: Fund Community Multisig

```
npm install --dev
```


You need to configure:

```
ETH_RPC_MAINNET=<Ethereum node>
```

Write the proposal in `contract/proposal.sol`
Write the test for the proposal in `test/proposal.test.ts`
Set the block number in `hardhat.config.ts` to afix recent block.

Run the test:

```
npx hardhat test
```

Deploy:

Gas price in gwei!
```
GAS_PRICE=80 PRIV_KEY=<Private key> npx hardhat run --network mainnet scripts/deploy.ts
```
