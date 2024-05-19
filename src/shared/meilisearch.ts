import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'aSampleMasterKey',
});

export default meiliClient;
