import { D3emRequest, D3emResponse } from '../d3em/types';
import { computeD3em } from '../d3em/compute';
import { wait } from './evaluationStats';

export const runD3em = async (payload: D3emRequest): Promise<D3emResponse> => {
  await wait(240);
  return computeD3em(payload);
};
