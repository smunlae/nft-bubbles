module.exports = {
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/01992007-eba3-df29-d2f5-c1108e2c4145',
        permanent: false,
      },
    ];
  },
};
