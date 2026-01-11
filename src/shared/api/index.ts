// Shared API - Public Exports
// FSD: shared/api

export { httpClient, tokenStorage, ApiError } from './http';
export { authApi } from './auth';
export type { User, Tokens, LoginDto, RegisterDto } from './auth';
export { tradesApi } from './trades';
export type { TradeQueryParams, CreateTradeDto, UpdateTradeDto } from './trades';
export { canvasApi, generateThumbnail, createEmptyCanvasData } from './canvas';
export type {
    CreateCanvasDto,
    UpdateCanvasDto,
    CanvasData,
    CanvasListItem,
    CanvasInitialData,
    TransformState,
} from './canvas';
