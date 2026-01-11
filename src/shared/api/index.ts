// Shared API - Public Exports
// FSD: shared/api

export { httpClient, tokenStorage, ApiError } from './httpClient';
export { authApi } from './auth';
export type { User, Tokens, LoginDto, RegisterDto } from './auth';
export { tradesApi } from './trades';
export type { TradeQueryParams, CreateTradeDto, UpdateTradeDto } from './trades';
export { canvasesApi } from './canvases';
export type { CreateCanvasDto, UpdateCanvasDto } from './canvases';

