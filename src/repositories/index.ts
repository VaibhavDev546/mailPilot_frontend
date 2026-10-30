import { DATA_SOURCE } from '@/constants';
import { createApiRepository } from './api';
import { createMockRepository } from './mock';
import type { Repository } from './types';

/** Single switch between mock and real backend: EXPO_PUBLIC_DATA_SOURCE=mock|api */
export const api: Repository = DATA_SOURCE === 'api' ? createApiRepository() : createMockRepository();
export type * from './types';
