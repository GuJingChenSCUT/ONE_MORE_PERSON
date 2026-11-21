// The local EVM checks contract behavior, not Monad throughput or finality.
export default {
  networks: {
    local: {
      type: 'edr-simulated',
      chainType: 'l1',
      chainId: 31337,
      hardfork: 'cancun',
      throwOnTransactionFailures: false,
    },
  },
};
